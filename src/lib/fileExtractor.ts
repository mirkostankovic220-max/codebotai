export interface ProjectFile {
  name: string;
  content: string;
  language: string;
}

export const extractFilesFromMessages = (
  messages: Array<{ role: string; content: any }>
): ProjectFile[] => {
  const files: Map<string, ProjectFile> = new Map();
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const filenameHintRegex = /(?:\/\/|#|<!--)\s*(?:file(?:name)?|path):\s*(\S+)/i;

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const text = typeof msg.content === "string" ? msg.content : "";
    let match;
    let idx = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const lang = match[1] || "txt";
      const code = match[2].trim();
      
      const before = text.slice(Math.max(0, match.index - 200), match.index);
      const fnMatch = filenameHintRegex.exec(code) || filenameHintRegex.exec(before);
      
      const ext = langToExt(lang);
      const name = fnMatch?.[1] || `file_${idx}.${ext}`;
      
      files.set(name, { name, content: code, language: lang });
      idx++;
    }
  }

  return Array.from(files.values());
};

const langToExt = (lang: string): string => {
  const map: Record<string, string> = {
    javascript: "js", typescript: "ts", tsx: "tsx", jsx: "jsx",
    html: "html", css: "css", python: "py", json: "json",
    sql: "sql", bash: "sh", shell: "sh", yaml: "yml",
    xml: "xml", markdown: "md", go: "go", rust: "rs",
    java: "java", cpp: "cpp", c: "c", ruby: "rb",
  };
  return map[lang.toLowerCase()] || lang;
};

const isReactLang = (lang: string) =>
  ["tsx", "jsx"].includes(lang.toLowerCase());

const isPython = (lang: string) =>
  ["python", "py"].includes(lang.toLowerCase());

const isJsLike = (lang: string) =>
  ["javascript", "js", "typescript", "ts"].includes(lang.toLowerCase());

const escapeScript = (code: string) =>
  code.replace(/<\/script>/gi, "<\\/script>");

export const buildPreviewHtml = (files: ProjectFile[]): string | null => {
  if (files.length === 0) return null;

  const htmlFile = files.find(f => f.language === "html");
  const cssFiles = files.filter(f => f.language === "css");
  const jsFiles = files.filter(f => isJsLike(f.language));
  const reactFiles = files.filter(f => isReactLang(f.language));
  const pythonFiles = files.filter(f => isPython(f.language));
  const otherFiles = files.filter(f =>
    !htmlFile || f !== htmlFile
    ? f.language !== "html" && f.language !== "css" && !isJsLike(f.language) && !isReactLang(f.language) && !isPython(f.language)
    : false
  );

  const cssContent = cssFiles.map(f => f.content).join("\n");

  // 1) HTML file as base
  if (htmlFile) {
    let html = htmlFile.content;
    if (cssContent) {
      html = html.includes("</head>")
        ? html.replace("</head>", `<style>${cssContent}</style></head>`)
        : `<style>${cssContent}</style>` + html;
    }
    const allJs = [...jsFiles, ...reactFiles].map(f => f.content).join("\n");
    if (allJs.trim()) {
      html = html.includes("</body>")
        ? html.replace("</body>", `<script>${escapeScript(allJs)}</script></body>`)
        : html + `<script>${escapeScript(allJs)}</script>`;
    }
    if (html.match(/class="[^"]*(?:flex|grid|bg-|text-|p-|m-|w-|h-)/)) {
      const tw = '<script src="https://cdn.tailwindcss.com"></script>';
      html = html.includes("<head>") ? html.replace("<head>", `<head>${tw}`) : tw + html;
    }
    return wrapFullDoc(html);
  }

  // 2) React / JSX / TSX
  if (reactFiles.length > 0) {
    const reactCode = [...reactFiles, ...jsFiles].map(f => f.content).join("\n\n");
    const cleaned = reactCode
      .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "")
      .replace(/^import\s+['"].*?['"];?\s*$/gm, "")
      .replace(/^export\s+default\s+/gm, "const __DefaultExport__ = ")
      .replace(/^export\s+/gm, "");
    const componentMatch = cleaned.match(/(?:function|const)\s+([A-Z]\w+)/);
    const mainComponent = componentMatch ? componentMatch[1] : "__DefaultExport__";

    return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
${cssContent ? `<style>${cssContent}</style>` : ""}
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>
</head><body>
<div id="root"></div>
<script type="text/babel" data-type="module">
const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext, Fragment } = React;
${escapeScript(cleaned)}
try {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(${mainComponent}));
} catch(e) {
  document.getElementById("root").innerHTML = '<pre style="color:red;padding:20px">Error: '+e.message+'</pre>';
}
</script>
</body></html>`;
  }

  // 3) Python via Pyodide WebAssembly
  if (pythonFiles.length > 0) {
    const pyCode = pythonFiles.map(f => f.content).join("\n\n");
    return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<script src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"></script>
${cssContent ? `<style>${cssContent}</style>` : ""}
<style>
body{margin:0;font-family:system-ui;background:#1a1a2e;color:#e0e0e0;padding:20px}
#output{background:#0d0d1a;border-radius:8px;padding:16px;font-family:'Fira Code',monospace;font-size:14px;white-space:pre-wrap;min-height:100px;border:1px solid #333}
#status{color:#888;margin-bottom:12px;font-size:13px}
.error{color:#ff6b6b}
.success{color:#51cf66}
h3{margin:0 0 8px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px}
</style>
</head><body>
<h3>Python Output</h3>
<div id="status">⏳ Loading Python runtime...</div>
<div id="output"></div>
<script>
const output = document.getElementById("output");
const status = document.getElementById("status");
async function run() {
  try {
    const pyodide = await loadPyodide();
    status.innerHTML = '<span class="success">✓ Python ready — executing...</span>';
    
    // Redirect stdout to our output div
    pyodide.runPython(\`
import sys, io
class OutputCapture:
    def __init__(self):
        self.output = []
    def write(self, text):
        self.output.append(text)
    def flush(self):
        pass
    def get(self):
        return "".join(self.output)
_capture = OutputCapture()
sys.stdout = _capture
sys.stderr = _capture
\`);
    
    pyodide.runPython(${JSON.stringify(pyCode)});
    
    const result = pyodide.runPython("_capture.get()");
    output.textContent = result || "(no output)";
    status.innerHTML = '<span class="success">✓ Execution complete</span>';
  } catch(e) {
    output.innerHTML = '<span class="error">' + e.message + '</span>';
    status.innerHTML = '<span class="error">✗ Error</span>';
  }
}
run();
</script>
</body></html>`;
  }

  // 4) Plain JS / TypeScript — execute directly
  const jsContent = jsFiles.map(f => f.content).join("\n");
  if (jsContent) {
    // Strip TS types for browser execution
    const browserJs = jsContent
      .replace(/:\s*(?:string|number|boolean|any|void|never|unknown)(?:\[\])?/g, "")
      .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "")
      .replace(/^export\s+/gm, "")
      .replace(/<\w+>/g, ""); // remove generics

    return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
${cssContent ? `<style>${cssContent}</style>` : ""}
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif}
#output{padding:20px;font-family:monospace;font-size:14px;white-space:pre-wrap}
</style>
</head><body>
<div id="output"></div>
<script>
// Capture console.log output to page
const _out = document.getElementById("output");
const _origLog = console.log;
console.log = function(...args) {
  _origLog.apply(console, args);
  _out.textContent += args.map(a => typeof a === 'object' ? JSON.stringify(a,null,2) : String(a)).join(' ') + '\\n';
};
try {
  ${escapeScript(browserJs)}
} catch(e) {
  _out.innerHTML += '<span style="color:red">Error: ' + e.message + '</span>\\n';
}
</script>
</body></html>`;
  }

  // 5) CSS only
  if (cssContent) {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>${cssContent}</style>
<style>body{margin:0;padding:20px;font-family:system-ui}</style>
</head><body>
<h1>CSS Preview</h1><p>Your styles are applied.</p>
<button class="btn">Sample Button</button>
<div class="container"><div class="card">Sample Card</div></div>
</body></html>`;
  }

  // 6) Any other code — try to run as JS, show output
  const allCode = files.map(f => f.content).join("\n\n");
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
body{margin:0;font-family:system-ui;background:#1a1a2e;color:#e0e0e0;padding:20px}
#output{background:#0d0d1a;border-radius:8px;padding:16px;font-family:monospace;font-size:14px;white-space:pre-wrap;min-height:100px;border:1px solid #333}
.error{color:#ff6b6b}
h3{margin:0 0 8px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px}
</style>
</head><body>
<h3>Code Output</h3>
<div id="output"></div>
<script>
const _out = document.getElementById("output");
const _origLog = console.log;
console.log = function(...args) {
  _origLog.apply(console, args);
  _out.textContent += args.map(a => typeof a === 'object' ? JSON.stringify(a,null,2) : String(a)).join(' ') + '\\n';
};
try {
  ${escapeScript(allCode)}
} catch(e) {
  _out.innerHTML = '<span class="error">Could not execute directly.\\n\\nCode:\\n</span>' + ${JSON.stringify(escapeHtml(allCode))};
}
</script>
</body></html>`;
};

const wrapFullDoc = (html: string): string => {
  if (html.trim().toLowerCase().startsWith("<!doctype") || html.trim().toLowerCase().startsWith("<html")) {
    return html;
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><style>body{margin:0;font-family:system-ui}</style></head><body>${html}</body></html>`;
};

const escapeHtml = (str: string) =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

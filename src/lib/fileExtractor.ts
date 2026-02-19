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

const isWebLang = (lang: string) =>
  ["html", "css", "javascript", "js", "typescript", "ts", "tsx", "jsx"].includes(lang.toLowerCase());

const isReactLang = (lang: string) =>
  ["tsx", "jsx", "typescript", "ts"].includes(lang.toLowerCase());

export const buildPreviewHtml = (files: ProjectFile[]): string | null => {
  if (files.length === 0) return null;

  const htmlFile = files.find(f => f.language === "html");
  const cssFiles = files.filter(f => f.language === "css");
  const jsFiles = files.filter(f => ["javascript", "js"].includes(f.language));
  const reactFiles = files.filter(f => isReactLang(f.language));
  const cssContent = cssFiles.map(f => f.content).join("\n");
  const jsContent = jsFiles.map(f => f.content).join("\n");

  // 1) If there's an HTML file, use it as base and inject CSS/JS
  if (htmlFile) {
    let html = htmlFile.content;

    if (cssContent) {
      if (html.includes("</head>")) {
        html = html.replace("</head>", `<style>${cssContent}</style></head>`);
      } else {
        html = `<style>${cssContent}</style>` + html;
      }
    }

    const allJs = jsContent + "\n" + reactFiles.filter(f => !jsFiles.includes(f)).map(f => f.content).join("\n");
    if (allJs.trim()) {
      if (html.includes("</body>")) {
        html = html.replace("</body>", `<script>${allJs}</script></body>`);
      } else {
        html += `<script>${allJs}</script>`;
      }
    }

    if (html.match(/class="[^"]*(?:flex|grid|bg-|text-|p-|m-|w-|h-)/)) {
      const tailwindTag = '<script src="https://cdn.tailwindcss.com"><\/script>';
      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>${tailwindTag}`);
      } else {
        html = tailwindTag + html;
      }
    }

    return wrapFullDoc(html);
  }

  // 2) React / JSX / TSX code — transpile and render with Babel + React CDN
  if (reactFiles.length > 0) {
    const reactCode = reactFiles.map(f => f.content).join("\n\n");
    // Strip import/export statements for browser execution
    const cleaned = reactCode
      .replace(/^import\s+.*?[;]\s*$/gm, "")
      .replace(/^export\s+default\s+/gm, "const __DefaultExport__ = ")
      .replace(/^export\s+/gm, "");

    // Try to find the main component name
    const componentMatch = cleaned.match(/(?:function|const)\s+([A-Z]\w+)/);
    const mainComponent = componentMatch ? componentMatch[1] : "__DefaultExport__";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  ${cssContent ? `<style>${cssContent}</style>` : ""}
  <style>body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext, Fragment } = React;
    
    ${cleaned}

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(React.createElement(${mainComponent}));
  <\/script>
</body>
</html>`;
  }

  // 3) Plain JS — execute it directly and render any DOM output
  if (jsContent) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  ${cssContent ? `<style>${cssContent}</style>` : ""}
  <style>body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>
</head>
<body>
  <script>${jsContent}<\/script>
</body>
</html>`;
  }

  // 4) CSS only — show a styled demo
  if (cssContent) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>${cssContent}</style>
  <style>body{margin:0;padding:20px;font-family:system-ui}</style>
</head>
<body>
  <h1>CSS Preview</h1>
  <p>Your styles are applied to this page.</p>
  <button class="btn">Sample Button</button>
  <div class="container"><div class="card">Sample Card</div></div>
</body>
</html>`;
  }

  // 5) Non-web files — show formatted code (last resort)
  const codePreview = files
    .map(f => `<div style="margin-bottom:16px"><h3 style="font-family:monospace;color:#888;margin-bottom:4px">${escapeHtml(f.name)}</h3><pre style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px"><code>${escapeHtml(f.content)}</code></pre></div>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{background:#11111b;padding:20px;font-family:system-ui}</style></head><body>${codePreview}</body></html>`;
};

const wrapFullDoc = (html: string): string => {
  if (html.trim().toLowerCase().startsWith("<!doctype") || html.trim().toLowerCase().startsWith("<html")) {
    return html;
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><script src="https://cdn.tailwindcss.com"><\/script><style>body{margin:0;font-family:system-ui}</style></head><body>${html}</body></html>`;
};

const escapeHtml = (str: string) =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

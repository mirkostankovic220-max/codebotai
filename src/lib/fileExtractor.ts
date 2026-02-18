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

export const buildPreviewHtml = (files: ProjectFile[]): string | null => {
  if (files.length === 0) return null;

  const htmlFile = files.find(f => f.language === "html");
  const cssFiles = files.filter(f => f.language === "css");
  const jsFiles = files.filter(f => ["javascript", "js"].includes(f.language));

  // If there's an HTML file, use it as the base
  if (htmlFile) {
    let html = htmlFile.content;
    
    // Inject CSS files
    const cssContent = cssFiles.map(f => f.content).join("\n");
    if (cssContent && !html.includes("<style>")) {
      html = html.replace("</head>", `<style>${cssContent}</style></head>`);
    }

    // Inject JS files
    const jsContent = jsFiles.map(f => f.content).join("\n");
    if (jsContent && !html.includes("<script>")) {
      html = html.replace("</body>", `<script>${jsContent}</script></body>`);
    }

    // Add Tailwind CDN if using tailwind classes
    if (html.match(/class="[^"]*(?:flex|grid|bg-|text-|p-|m-|w-|h-)/)) {
      html = html.replace("<head>", '<head><script src="https://cdn.tailwindcss.com"></script>');
    }

    return html;
  }

  // No HTML file — build a preview from selected CSS/JS files
  const cssContent = cssFiles.map(f => f.content).join("\n");
  const jsContent = jsFiles.map(f => f.content).join("\n");
  
  // If only non-previewable files (e.g. python, json), show code
  if (!cssContent && !jsContent) {
    const codePreview = files
      .map(f => `<div style="margin-bottom:16px"><h3 style="font-family:monospace;color:#888;margin-bottom:4px">${f.name}</h3><pre style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px"><code>${escapeHtml(f.content)}</code></pre></div>`)
      .join("");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{background:#11111b;padding:20px;font-family:system-ui}</style></head><body>${codePreview}</body></html>`;
  }

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">`;
  if (cssContent) html += `<style>${cssContent}</style>`;
  html += `</head><body>`;
  if (jsContent) html += `<script>${jsContent}</script>`;
  html += `</body></html>`;

  return html;
};

const escapeHtml = (str: string) =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
      
      // Try to find filename from a comment in the code or text before the block
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
  const htmlFile = files.find(f => f.language === "html");
  if (!htmlFile) return null;

  let html = htmlFile.content;
  
  const cssFile = files.find(f => f.language === "css");
  if (cssFile && !html.includes("<style>")) {
    html = html.replace("</head>", `<style>${cssFile.content}</style></head>`);
  }

  const jsFile = files.find(f => ["javascript", "js"].includes(f.language));
  if (jsFile && !html.includes("<script>")) {
    html = html.replace("</body>", `<script>${jsFile.content}</script></body>`);
  }

  // Add Tailwind CDN if using tailwind classes
  if (html.match(/class="[^"]*(?:flex|grid|bg-|text-|p-|m-|w-|h-)/)) {
    html = html.replace("<head>", '<head><script src="https://cdn.tailwindcss.com"></script>');
  }

  return html;
};

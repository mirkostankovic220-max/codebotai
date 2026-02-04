import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock = ({ code, language }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400 uppercase">{language || "code"}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-slate-300 whitespace-pre-wrap break-words">
          {code}
        </code>
      </pre>
    </div>
  );
};

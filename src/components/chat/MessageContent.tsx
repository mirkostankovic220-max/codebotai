import { CodeBlock } from "./CodeBlock";

interface MessageContentProps {
  content: string;
}

export const MessageContent = ({ content }: MessageContentProps) => {
  // Parse content to extract code blocks
  const parseContent = (text: string) => {
    const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = text.slice(lastIndex, match.index).trim();
        if (textContent) {
          parts.push({ type: "text", content: textContent });
        }
      }
      
      // Add code block
      parts.push({
        type: "code",
        language: match[1] || "code",
        content: match[2].trim(),
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex).trim();
      if (remainingText) {
        parts.push({ type: "text", content: remainingText });
      }
    }
    
    // If no code blocks found, return entire content as text
    if (parts.length === 0) {
      parts.push({ type: "text", content: text });
    }
    
    return parts;
  };

  const parts = parseContent(content);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => (
        part.type === "code" ? (
          <CodeBlock key={index} code={part.content} language={part.language || "code"} />
        ) : (
          <p key={index} className="whitespace-pre-wrap leading-relaxed">
            {part.content}
          </p>
        )
      ))}
    </div>
  );
};

import DOMPurify from "dompurify";

interface RichTextContentProps {
  html: string;
  className?: string;
}

export default function RichTextContent({ html, className = "" }: RichTextContentProps) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "h1", "h2", "blockquote", "span", "mark"],
    ALLOWED_ATTR: ["style"],
  });

  return (
    <div
      className={`rich-text-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

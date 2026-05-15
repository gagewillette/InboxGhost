"use client";

import HtmlEmailFrame from "./HtmlEmailFrame";

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

function PlainTextEmail({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <div
      style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif",
        fontSize: "13.5px",
        lineHeight: "1.7",
        color: "var(--ig-fg)",
      }}
    >
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.86 0.14 170)", textDecoration: "underline" }}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

interface Props {
  body: string;
  content_type: string;
  snippet: string;
}

// Heuristic: detect HTML by looking for structural tags. Requires a real tag
// name so plain-text "a<b" or "<3" don't trigger.
const HTML_TAG_RE = /<(?:!doctype|html|body|head|div|p|table|tr|td|a\b|img|span|br|h[1-6]|ul|ol|li|style|meta)\b/i;

export default function EmailRenderer({ body, content_type, snippet }: Props) {
  const content = body || snippet;

  if (!content) {
    return <span style={{ color: "var(--ig-fg-muted)" }}>(no content)</span>;
  }

  // Trust stored content_type when it's HTML, but also sniff the body. Legacy
  // rows synced before parseEmail preferred HTML across all multipart subtypes
  // may have content_type="text/plain" while the body itself is HTML.
  if (content_type === "text/html" || HTML_TAG_RE.test(content)) {
    return <HtmlEmailFrame html={content} />;
  }

  return <PlainTextEmail text={content} />;
}

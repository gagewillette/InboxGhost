"use client";

import { useRef, useState } from "react";

// CSS injected into every HTML email iframe.
// Resets email backgrounds/fonts to match the ig- dark design system,
// while leaving structural layout untouched.
const INJECTED_CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  html {
    color-scheme: dark;
    background: transparent !important;
  }

  body {
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    color: oklch(0.78 0.01 260) !important;
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif !important;
    font-size: 13.5px !important;
    line-height: 1.7 !important;
    -webkit-font-smoothing: antialiased;
    word-break: break-word;
  }

  /* Force readable text on dark background for elements with explicit colors */
  p, span, div, td, th, li {
    color: inherit;
  }

  a { color: oklch(0.86 0.14 170) !important; text-decoration: underline; }
  a:hover { color: oklch(0.92 0.14 170) !important; }

  img { max-width: 100% !important; height: auto !important; border-radius: 4px; display: block; }

  blockquote {
    border-left: 2px solid oklch(0.28 0.01 265) !important;
    margin: 8px 0 !important;
    padding: 0 0 0 14px !important;
    color: oklch(0.55 0.01 260) !important;
    background: transparent !important;
  }

  pre {
    background: oklch(0.22 0.01 265) !important;
    border-radius: 4px;
    padding: 12px !important;
    overflow-x: auto;
    font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace !important;
    font-size: 12px !important;
    color: oklch(0.86 0.01 260) !important;
  }

  code {
    font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace !important;
    font-size: 12px !important;
    background: oklch(0.22 0.01 265) !important;
    color: oklch(0.86 0.01 260) !important;
    padding: 1px 5px;
    border-radius: 3px;
  }

  hr { border: none !important; border-top: 1px solid oklch(0.28 0.01 265) !important; margin: 16px 0; }

  table { border-collapse: collapse; max-width: 100%; }
  td, th { padding: 4px 8px; vertical-align: top; }

  /* Nuke white/light backgrounds that make content unreadable on dark theme */
  [bgcolor], [background] { background: transparent !important; }

  /* Gmail quote toggle */
  .gmail_quote { color: oklch(0.55 0.01 260) !important; }
  .gmail_extra { display: none; }
`;

interface Props {
  html: string;
}

export default function HtmlEmailFrame({ html }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><style>${INJECTED_CSS}</style></head><body>${html}</body></html>`;

  const handleLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.body) {
      // Add a tick so the browser finishes layout before we measure
      requestAnimationFrame(() => {
        const h = iframeRef.current?.contentDocument?.body.scrollHeight ?? 300;
        setHeight(Math.max(h + 24, 120));
      });
    }
  };

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      onLoad={handleLoad}
      title="Email content"
      className="ig-email-frame"
      style={{ height: `${height}px` }}
    />
  );
}

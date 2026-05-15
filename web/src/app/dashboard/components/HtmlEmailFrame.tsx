"use client";

import { useEffect, useRef, useState } from "react";

const INJECTED_CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    -webkit-font-smoothing: antialiased;
    word-break: break-word;
    /* Low-specificity defaults — any color/background in the email's own styles wins */
    color: #ffffff;
    background-color: #f5f5f0;
  }

  /* Prevent wide email layouts from overflowing the iframe */
  img { max-width: 100% !important; height: auto !important; }
  table { max-width: 100%; }

  /* Hide Gmail reply-history boilerplate */
  .gmail_extra { display: none; }
`;

const INJECTED_SCRIPT = `
(function () {
  function reportHeight() {
    var h = Math.max(document.body ? document.body.scrollHeight : 120, 120);
    window.parent.postMessage({ type: 'ig-height', h: h }, '*');
  }

  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(reportHeight);
    if (document.body) ro.observe(document.body);
    else document.addEventListener('DOMContentLoaded', function () { ro.observe(document.body); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { requestAnimationFrame(reportHeight); });
  } else {
    requestAnimationFrame(reportHeight);
  }
})();
`;

interface Props {
  html: string;
}

export default function HtmlEmailFrame({ html }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source === iframeRef.current?.contentWindow && e.data?.type === "ig-height") {
        setHeight(Math.max(e.data.h + 24, 120));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${INJECTED_CSS}</style><script>${INJECTED_SCRIPT}<\/script></head><body>${html}</body></html>`;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="Email content"
      className="ig-email-frame"
      style={{ height: `${height}px` }}
    />
  );
}

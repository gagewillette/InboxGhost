"use client";

import { useId } from "react";

interface GhostLogoProps {
  size?: number;
  stroke?: number;
  glow?: boolean;
  eyes?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function GhostLogo({
  size = 48,
  stroke = 1.5,
  glow = false,
  eyes = true,
  className = "",
  style = {},
}: GhostLogoProps) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="InboxGhost"
    >
      {glow && (
        <defs>
          <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={glow ? `url(#glow-${id})` : undefined}
      >
        <path
          d="M10 34
             C 10 20.7, 19.85 10, 32 10
             C 44.15 10, 54 20.7, 54 34
             L 54 62
             L 48.5 56
             L 43 62
             L 37.5 56
             L 32 62
             L 26.5 56
             L 21 62
             L 15.5 56
             L 10 62
             Z"
          fill="none"
        />
        {eyes && (
          <>
            <ellipse cx="25" cy="32" rx="2.2" ry="3.2" fill="currentColor" />
            <ellipse cx="39" cy="32" rx="2.2" ry="3.2" fill="currentColor" />
            <ellipse cx="32" cy="42" rx="2.2" ry="2.8" fill="none" />
          </>
        )}
      </g>
    </svg>
  );
}

export function GhostWordmark({ size = 20 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ig-fg)" }}>
      <GhostLogo size={size * 1.4} stroke={1.6} />
      <span
        style={{
          fontFamily: "var(--ig-serif)",
          fontSize: size * 1.05,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          fontWeight: 600,
          color: "var(--ig-fg)",
        }}
      >
        Inbox<span style={{ color: "var(--ig-accent)" }}>Ghost</span>
      </span>
    </div>
  );
}

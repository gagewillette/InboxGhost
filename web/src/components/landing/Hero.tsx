"use client";

import { useEffect, useState } from "react";
import { GhostLogo, GhostWordmark } from "./GhostLogo";
import { useLenis } from "../LenisProvider";
import FinalCTAButton from "./CTAButton";

const ENVELOPES = Array.from({ length: 14 }, (_, i) => ({
  i,
  x: 8 + ((i * 83) % 92),
  y: 12 + ((i * 47) % 78),
  scale: 0.55 + ((i * 13) % 10) / 20,
  speed: 0.2 + ((i * 7) % 10) / 40,
  delay: (i * 0.37) % 4,
  drift: (i % 2 ? 1 : -1) * (8 + (i % 5) * 3),
}));

export default function Hero({ onSignIn }: { onSignIn: () => void }) {
  const [t, setT] = useState(0);
  const lenis = useLenis();

  useEffect(() => {
    let rafId: number;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    lenis?.scrollTo(`#${id}`, { offset: -80, duration: 1.2 });
  };

  return (
    <section className="ig-hero">
      <div className="ig-hero-grid" aria-hidden />
      <div className="ig-scanlines" aria-hidden />
      <div className="ig-hero-glow" aria-hidden />

      <div className="ig-env-field" aria-hidden>
        {ENVELOPES.map((e) => {
          const drift = Math.sin(t * e.speed + e.delay) * e.drift;
          const bob = Math.cos(t * e.speed * 0.8 + e.delay) * 6;
          return (
            <svg
              key={e.i}
              className="ig-env"
              suppressHydrationWarning
              style={{
                left: `${e.x}%`,
                top: `${e.y}%`,
                transform: `translate(${drift}px, ${bob}px) scale(${e.scale})`,
                opacity: 0.14 + (e.i % 3) * 0.05,
              }}
              width="44"
              height="32"
              viewBox="0 0 44 32"
              fill="none"
            >
              <rect x="0.75" y="0.75" width="42.5" height="30.5" rx="2" stroke="currentColor" strokeWidth="1" />
              <path d="M1 2 L22 18 L43 2" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          );
        })}
      </div>

      <div
        className="ig-hero-ghost"
        style={{
          transform: `translate(-50%, calc(-50% + ${Math.sin(t * 0.9) * 10}px)) rotate(${Math.sin(t * 0.5) * 1.5}deg)`,
        }}
        aria-hidden
      >
        <GhostLogo size={360} stroke={1.1} glow eyes />
      </div>

      <nav className="ig-nav">
        <GhostWordmark size={16} />
        <div className="ig-nav-links">
          <a href="#how" onClick={scrollTo("how")}>How it works</a>
          <a href="#transparency" onClick={scrollTo("transparency")}>Transparency</a>
          <a href="#pricing" onClick={scrollTo("pricing")}>Pricing</a>
          <a href="#faq" onClick={scrollTo("faq")}>FAQ</a>
        </div>
        <div className="ig-nav-cta">
          <button className="ig-ghost-btn" onClick={onSignIn}>Sign in</button>
          <button className="ig-primary-btn" onClick={() => lenis?.scrollTo("#cta", { offset: -80 })}>
            Get early access
          </button>
        </div>
      </nav>

      <div className="ig-hero-copy">
        <div className="ig-eyebrow">
          <span className="ig-dot" />
          Now in private beta · trained only on data you approve
        </div>
        <h1 className="ig-h1">
          Let a ghost <em>read your inbox</em>
          <br /> so you don&apos;t have to.
        </h1>
        <p className="ig-sub">
          InboxGhost triages your Gmail, summarizes every thread in three bullets, and
          drafts replies in your actual voice. You stay in control — of the queue, the
          drafts, <span className="ig-underline">and the data</span>.
        </p>
        <div className="ig-hero-cta">
          <FinalCTAButton onSignIn={onSignIn} />
          <button
            className="ig-ghost-btn ig-ghost-btn-lg"
            onClick={scrollTo("how")}
          >
            See how it works
          </button>
        </div>
        <div className="ig-hero-meta">
          <div><strong>4.2h</strong> median time back per week</div>
          <div className="ig-sep" />
          <div><strong>128</strong> emails triaged per run, avg.</div>
          <div className="ig-sep" />
          <div><strong>0</strong> data kept without your permission</div>
        </div>
      </div>
    </section>
  );
}

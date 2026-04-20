"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    kw: "01 · Triage",
    title: "Sort the signal from the noise",
    body: "Every new thread is scored, labeled, and slotted into a priority lane. Newsletters, vendor pings, and low-stakes updates get queued. People waiting on you rise to the top.",
  },
  {
    kw: "02 · Summarize",
    title: "Three bullets. Every thread.",
    body: "No more scrolling twelve replies to find the ask. Every thread — including the history — collapses into three bullets: what, who's waiting, what's next.",
  },
  {
    kw: "03 · Draft",
    title: "Replies that sound like you",
    body: "A model fine-tuned on your prior sent mail writes the response. Your cadence, your sign-off, your em-dashes. You review, tweak, send.",
  },
];

const DRAFT_TEXT = `Maya —

Going with retention as the Q3 north star. Activation matters but we can't fix the leaky bucket from the top.

Raj: you have the two headcount I've been holding. Ship the re-engagement loop first, the paywall experiments second. I'll clear the hiring reqs today.

Let's lock it on Friday's review.

— J`;

function TypewriterDraft({ active }: { active: boolean }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (!active) { setShown(""); return; }
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(DRAFT_TEXT.slice(0, i));
      if (i >= DRAFT_TEXT.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [active]);

  return <pre className="ig-draft-body">{shown}<span className="ig-caret" /></pre>;
}

function TriageAnim({ active }: { active: number }) {
  const lanes = [
    { label: "Now", tone: "hot", items: ["Priya — Q3 offsite date?", "Ben — contract redline"] },
    { label: "Today", tone: "warm", items: ["Eng standup notes", "Design review · Thu 3p", "Legal · NDA draft"] },
    { label: "Later", tone: "cool", items: ["Newsletter: The Overflow", "AWS billing alert", "Calendly confirmation"] },
  ];

  return (
    <div className="ig-stage">
      <div className="ig-stage-chrome">
        <div className="ig-stage-dots"><span /><span /><span /></div>
        <div className="ig-stage-title">inbox · ghost mode</div>
        <div className="ig-stage-badge">● live</div>
      </div>
      <div className="ig-stage-body">
        <div className={`ig-slide ${active === 0 ? "on" : ""}`}>
          <div className="ig-lanes">
            {lanes.map((lane, i) => (
              <div key={i} className={`ig-lane ig-lane-${lane.tone}`}>
                <div className="ig-lane-head">
                  <span className="ig-lane-label">{lane.label}</span>
                  <span className="ig-lane-count">{lane.items.length}</span>
                </div>
                {lane.items.map((it, j) => (
                  <div key={j} className="ig-lane-item" style={{ animationDelay: `${0.1 + j * 0.08 + i * 0.15}s` }}>
                    <div className="ig-lane-bar" />
                    {it}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className={`ig-slide ${active === 1 ? "on" : ""}`}>
          <div className="ig-summary">
            <div className="ig-sum-thread">
              <div className="ig-sum-from">
                <div className="ig-avatar">M</div>
                <div>
                  <div className="ig-sum-name">Maya Chen <span>· VP Product</span></div>
                  <div className="ig-sum-sub">Re: Q3 OKR alignment (14 messages)</div>
                </div>
                <div className="ig-sum-pill">waiting 2d</div>
              </div>
              <ul className="ig-bullets">
                <li style={{ animationDelay: "0.1s" }}>Maya wants a decision on <b>retention vs. activation</b> as the Q3 north star.</li>
                <li style={{ animationDelay: "0.35s" }}>Eng capacity is the blocker — Raj needs headcount confirmed by Fri.</li>
                <li style={{ animationDelay: "0.6s" }}>You&apos;re the last approver. <b>She needs a yes/no, not a proposal.</b></li>
              </ul>
            </div>
          </div>
        </div>

        <div className={`ig-slide ${active === 2 ? "on" : ""}`}>
          <div className="ig-draft">
            <div className="ig-draft-head">
              <div>
                <div className="ig-draft-to">To: maya@northwind.co</div>
                <div className="ig-draft-subj">Re: Q3 OKR alignment</div>
              </div>
              <div className="ig-draft-pill">
                <span className="ig-mini-ghost" /> drafted in your voice
              </div>
            </div>
            <TypewriterDraft key={`draft-${active}`} active={active === 2} />
            <div className="ig-draft-actions">
              <button className="ig-primary-btn ig-primary-btn-sm">Send as is</button>
              <button className="ig-ghost-btn ig-ghost-btn-sm">Edit</button>
              <button className="ig-ghost-btn ig-ghost-btn-sm">Regenerate</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % 3), 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="how" className="ig-how">
      <div className="ig-section-head">
        <div className="ig-kicker">{"//"} How it works</div>
        <h2 className="ig-h2">
          From <em>382 unread</em> to
          <br /> inbox-zero, in one pass.
        </h2>
      </div>
      <div className="ig-how-grid">
        <div className="ig-how-steps">
          {STEPS.map((s, i) => (
            <button
              key={i}
              className={`ig-step ${active === i ? "is-active" : ""}`}
              onClick={() => setActive(i)}
            >
              <div className="ig-step-kw">{s.kw}</div>
              <div className="ig-step-title">{s.title}</div>
              <div className="ig-step-body">{s.body}</div>
              <div className="ig-step-bar"><div className="ig-step-bar-fill" /></div>
            </button>
          ))}
        </div>
        <div className="ig-how-stage">
          <TriageAnim active={active} />
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { GhostLogo } from "./GhostLogo";

const EMAILS = [
  {
    id: 0, from: "Priya Ramanathan", co: "Northwind", subj: "Q3 offsite — lock the Sept dates?", time: "9:41", priority: "now", waiting: true,
    bullets: ["Priya proposes Sept 23–25 in Tahoe.", "Needs your confirm by EOW to book.", "Budget is approved, venue is held."],
    draft: "Sept 23–25 works. Book it. I'll handle the exec invites this week.",
  },
  {
    id: 1, from: "Ben Ostrowski", co: "Counsel", subj: "Contract redline — v3 attached", time: "9:12", priority: "now", waiting: true,
    bullets: ["Ben pushed back on the IP assignment clause (§4.2).", "He's fine with everything else — just that one section.", "Wants a 15-min call before Friday's signing."],
    draft: "Friday 2pm works for me. §4.2 is a red line for us — let's talk through the carve-out live. I'll bring Jamie.",
  },
  {
    id: 2, from: "AWS Billing", co: "Amazon", subj: "Your April invoice is ready", time: "8:50", priority: "later", waiting: false,
    bullets: ["Bill is $4,218 — up 12% from March.", "EC2 spend drove the increase (staging cluster).", "No action required; auto-pays on the 28th."],
    draft: null,
  },
  {
    id: 3, from: "Design Team", co: "Internal", subj: "Design review · Thu 3p", time: "8:31", priority: "today", waiting: false,
    bullets: ["Four flows ready for review: onboarding, settings, billing, referrals.", "Mel is driving. Figma link in the cal invite.", "Async feedback also fine — just drop it in the thread."],
    draft: "I'll be there live. Onboarding flow is the one I want to spend the most time on.",
  },
  {
    id: 4, from: "Sara Park", co: "Partnerships", subj: "Intro: Stripe biz-dev team", time: "7:58", priority: "today", waiting: true,
    bullets: ["Sara wants to intro you to Priya at Stripe (partnerships).", "Context: they're building a tool in your space.", "She's double-opting — needs your yes before sending."],
    draft: "Yes, please intro. Stripe's partnerships team is high on my list for Q3.",
  },
  {
    id: 5, from: "The Overflow", co: "Newsletter", subj: "This week in infra", time: "7:02", priority: "later", waiting: false,
    bullets: ["Usual weekly roundup — Kubernetes, Postgres tips, a deep-dive on OpenTelemetry.", "Nothing marked urgent.", "Safe to archive."],
    draft: null,
  },
];

export default function InboxDemo() {
  const [processed, setProcessed] = useState(0);
  const [selectedId, setSelectedId] = useState(1);

  useEffect(() => {
    const id = setInterval(() => setProcessed((p) => Math.min(p + 1, EMAILS.length)), 500);
    return () => clearInterval(id);
  }, []);

  const selected = EMAILS.find((e) => e.id === selectedId)!;

  return (
    <section className="ig-demo">
      <div className="ig-section-head">
        <div className="ig-kicker">{"//"} The interface</div>
        <h2 className="ig-h2">Three panes. <em>Zero cognitive tax.</em></h2>
        <p className="ig-section-sub">
          The ghost works in your Gmail sidebar. Click a thread, read the bullets,
          send the draft. Or hit <kbd>⌘K</kbd>, &ldquo;clear the queue,&rdquo; and let it rip.
        </p>
      </div>

      <div className="ig-inbox">
        <div className="ig-inbox-side">
          <div className="ig-inbox-side-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <GhostLogo size={18} stroke={1.5} />
              <span style={{ fontFamily: "var(--ig-serif)", fontSize: 18 }}>Queue</span>
            </div>
            <span className="ig-inbox-count">{processed}/{EMAILS.length}</span>
          </div>
          <div className="ig-inbox-filter">
            <span className="ig-chip is-active">Needs you</span>
            <span className="ig-chip">Today</span>
            <span className="ig-chip">All</span>
          </div>
          <div className="ig-inbox-list">
            {EMAILS.map((e, i) => {
              const done = i < processed;
              return (
                <div
                  key={e.id}
                  className={`ig-inbox-item ${selectedId === e.id ? "is-sel" : ""} ${!done ? "is-pending" : ""} prio-${e.priority}`}
                  onClick={() => done && setSelectedId(e.id)}
                >
                  <div className="ig-inbox-left">
                    <div className="ig-inbox-dot" />
                    <div className="ig-inbox-meta">
                      <div className="ig-inbox-from">{e.from} <span>· {e.co}</span></div>
                      <div className="ig-inbox-subj">{e.subj}</div>
                    </div>
                  </div>
                  <div className="ig-inbox-right">
                    {done ? (
                      <span className="ig-tag">{e.waiting ? "reply" : "fyi"}</span>
                    ) : (
                      <span className="ig-tag ig-tag-processing">
                        <span className="ig-spinner" /> reading
                      </span>
                    )}
                    <span className="ig-inbox-time">{e.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="ig-inbox-side-foot">
            <button className="ig-primary-btn ig-primary-btn-sm" style={{ width: "100%" }}>
              Clear the queue →
            </button>
          </div>
        </div>

        <div className="ig-inbox-detail">
          <div className="ig-detail-head">
            <div>
              <div className="ig-detail-subj">{selected.subj}</div>
              <div className="ig-detail-from">
                <div className="ig-avatar ig-avatar-md">{selected.from[0]}</div>
                <div>
                  <div className="ig-detail-name">{selected.from} <span>· {selected.co}</span></div>
                  <div className="ig-detail-sub">{selected.time} · via Gmail</div>
                </div>
              </div>
            </div>
            <div className="ig-detail-tags">
              <span className={`ig-prio-tag prio-${selected.priority}`}>{selected.priority}</span>
              {selected.waiting && <span className="ig-prio-tag prio-wait">they&apos;re waiting</span>}
            </div>
          </div>

          <div className="ig-detail-section">
            <div className="ig-detail-section-head">
              <span className="ig-mini-ghost" /> Ghost summary
            </div>
            <ul className="ig-bullets">
              {selected.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>

          {selected.draft ? (
            <div className="ig-detail-section">
              <div className="ig-detail-section-head">
                <span className="ig-mini-ghost" /> Drafted reply <span className="ig-muted">· voice match 94%</span>
              </div>
              <div className="ig-detail-draft">{selected.draft}</div>
              <div className="ig-draft-actions">
                <button className="ig-primary-btn ig-primary-btn-sm">Send</button>
                <button className="ig-ghost-btn ig-ghost-btn-sm">Edit</button>
                <button className="ig-ghost-btn ig-ghost-btn-sm">Regenerate</button>
              </div>
            </div>
          ) : (
            <div className="ig-detail-section">
              <div className="ig-detail-section-head">
                <span className="ig-mini-ghost" /> No reply needed
              </div>
              <div className="ig-muted" style={{ padding: "8px 0" }}>Queued to auto-archive in 24h unless you mark it.</div>
              <div className="ig-draft-actions">
                <button className="ig-ghost-btn ig-ghost-btn-sm">Archive now</button>
                <button className="ig-ghost-btn ig-ghost-btn-sm">Keep</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

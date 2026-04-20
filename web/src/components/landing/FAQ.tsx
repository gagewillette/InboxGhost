"use client";

import { useState } from "react";

const QS = [
  {
    q: "Does InboxGhost read all my email?",
    a: "Only the threads in your inbox and sent folder, and only when it's triaging or training. We don't store raw message bodies beyond the rolling 180-day training window, and you can shrink that window or turn it off entirely from the data ledger.",
  },
  {
    q: "How do you stop the drafts from sounding like generic AI slop?",
    a: "We fine-tune a small model per user on your actual sent mail — cadence, vocabulary, sign-off, the way you break paragraphs. The model sees your writing, never anyone else's. There's a voice-match score on every draft so you know when it's off.",
  },
  {
    q: "What happens if I cancel?",
    a: "Your data is purged within 60 seconds of cancellation, including fine-tuned weights and backups. You get an email receipt with the deletion timestamp and a cryptographic hash of the empty state.",
  },
  {
    q: "Why Gmail only?",
    a: "We went deep on one platform before going wide. Outlook and Fastmail are on the roadmap for late 2026.",
  },
  {
    q: "Who's behind this?",
    a: "A small team of ex-platform engineers who got tired of watching smart people lose their Sundays to their inbox. We're privately funded and not taking growth-at-all-costs money.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="ig-faq">
      <div className="ig-section-head">
        <div className="ig-kicker">{"//"} FAQ</div>
        <h2 className="ig-h2">The questions we <em>actually</em> get.</h2>
      </div>
      <div className="ig-faq-list">
        {QS.map((item, i) => (
          <div key={i} className={`ig-faq-item ${open === i ? "is-open" : ""}`}>
            <button className="ig-faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{item.q}</span>
              <span className="ig-faq-plus">{open === i ? "−" : "+"}</span>
            </button>
            <div className="ig-faq-a-wrap">
              <div className="ig-faq-a">{item.a}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

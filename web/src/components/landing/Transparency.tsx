"use client";

import { useState } from "react";

const DATA_ITEMS = [
  { id: "sent-emails", label: "Sent emails (last 180 days)", size: "14,204 msgs · 38.2 MB", purpose: "Fine-tunes your voice model. We never read incoming mail for training." },
  { id: "voice-model", label: "Your voice embedding", size: "1 vector · 4 KB", purpose: "A numerical fingerprint of how you write. Not human-readable. Rebuilt on demand." },
  { id: "thread-meta", label: "Thread metadata", size: "9,812 rows · 2.1 MB", purpose: "Sender, subject, timestamp, and your response latency. Used to rank priority." },
  { id: "draft-history", label: "Draft history", size: "284 drafts · 1.4 MB", purpose: "What we suggested, what you edited. Improves suggestions over time." },
  { id: "labels", label: "Gmail labels & filters", size: "42 labels · < 1 KB", purpose: "Read-only. Used to respect your existing workflow." },
  { id: "oauth", label: "OAuth token", size: "1 token · encrypted", purpose: "Required. Revoke from Google at any time; we revoke server-side within 60s." },
];

export default function Transparency() {
  const [selected, setSelected] = useState(new Set(["sent-emails", "voice-model", "thread-meta"]));
  const [deleted, setDeleted] = useState(new Set<string>());

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  };

  const del = (id: string) => {
    setDeleted((d) => new Set(d).add(id));
    setTimeout(() => {
      setDeleted((d) => {
        const n = new Set(d);
        n.delete(id);
        return n;
      });
    }, 1600);
  };

  return (
    <section id="transparency" className="ig-transp">
      <div className="ig-section-head">
        <div className="ig-kicker">{"//"} Radical transparency</div>
        <h2 className="ig-h2">
          You can see <em>every byte</em> we
          <br /> store about you. Really.
        </h2>
        <p className="ig-section-sub">
          Most email AIs ask for the keys and disappear into a black box. Ours ships
          with a live ledger. Keep what helps you. Delete the rest. Burn it all down
          whenever you want — one button, sixty seconds.
        </p>
      </div>

      <div className="ig-ledger">
        <div className="ig-ledger-chrome">
          <div className="ig-ledger-title">
            <span className="ig-mini-ghost" /> your_data.log
          </div>
          <div className="ig-ledger-actions">
            <button className="ig-ghost-btn ig-ghost-btn-sm">Export all (.zip)</button>
            <button className="ig-danger-btn">Delete everything</button>
          </div>
        </div>

        <div className="ig-ledger-head">
          <div>Keep</div>
          <div>What we store</div>
          <div>Footprint</div>
          <div>Why</div>
          <div />
        </div>

        {DATA_ITEMS.map((it) => {
          const kept = selected.has(it.id);
          const isDeleting = deleted.has(it.id);
          return (
            <div key={it.id} className={`ig-ledger-row ${kept ? "kept" : "muted"} ${isDeleting ? "deleting" : ""}`}>
              <div>
                <label className="ig-switch">
                  <input type="checkbox" checked={kept} onChange={() => toggle(it.id)} />
                  <span className="ig-switch-track"><span className="ig-switch-thumb" /></span>
                </label>
              </div>
              <div className="ig-ledger-label">{it.label}</div>
              <div className="ig-ledger-size">{it.size}</div>
              <div className="ig-ledger-why">{it.purpose}</div>
              <div>
                <button className="ig-ghost-btn ig-ghost-btn-xs" onClick={() => del(it.id)}>
                  {isDeleting ? "deleting…" : "delete"}
                </button>
              </div>
            </div>
          );
        })}

        <div className="ig-ledger-foot">
          <div><span className="ig-dot" /> Updated in real time. No hidden columns.</div>
          <div><a href="#">Read the data policy →</a></div>
        </div>
      </div>

      <div className="ig-transp-grid">
        <div className="ig-card">
          <div className="ig-card-num">01</div>
          <h3>Training is opt-in, per column.</h3>
          <p>Toggle off &ldquo;Sent emails&rdquo; and we rebuild your voice model without them. Takes about 40 seconds.</p>
        </div>
        <div className="ig-card">
          <div className="ig-card-num">02</div>
          <h3>Nothing leaves our servers.</h3>
          <p>We run our own inference. Your mail is never sent to third-party LLM providers, ever.</p>
        </div>
        <div className="ig-card">
          <div className="ig-card-num">03</div>
          <h3>&ldquo;Delete everything&rdquo; means it.</h3>
          <p>One click, 60-second purge across app DB, backups, and fine-tune weights. Email receipt included.</p>
        </div>
      </div>
    </section>
  );
}

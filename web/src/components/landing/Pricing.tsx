"use client";

import { useState } from "react";

const PLANS = [
  {
    name: "Solo",
    blurb: "For the lone operator drowning in Gmail.",
    monthly: 18,
    yearly: 15,
    features: ["1 inbox", "Unlimited summaries", "Unlimited drafts", "Voice model retrain", "Data ledger"],
    cta: "Start free for 14 days",
    featured: false,
  },
  {
    name: "Professional",
    blurb: "For exec-adjacent roles with real triage load.",
    monthly: 39,
    yearly: 32,
    features: ["Everything in Solo", "Calendar-aware drafts", "Team signature vault", "Priority inference", "Slack notifications"],
    cta: "Start free for 14 days",
    featured: true,
  },
  {
    name: "Team",
    blurb: "For founders, chiefs of staff, and EAs.",
    monthly: null,
    yearly: null,
    features: ["Multi-inbox delegation", "Shared voice profiles", "SSO + SCIM", "Audit log", "DPA + security review"],
    cta: "Talk to us",
    featured: false,
  },
];

export default function Pricing({ onSignIn }: { onSignIn: () => void }) {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="ig-pricing">
      <div className="ig-section-head">
        <div className="ig-kicker">{"//"} Pricing</div>
        <h2 className="ig-h2">Less than <em>one billable hour.</em></h2>
        <div className="ig-billing-toggle">
          <button className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button>
          <button className={yearly ? "on" : ""} onClick={() => setYearly(true)}>
            Yearly <span className="ig-save">− 17%</span>
          </button>
        </div>
      </div>
      <div className="ig-price-grid">
        {PLANS.map((p) => (
          <div key={p.name} className={`ig-price-card ${p.featured ? "featured" : ""}`}>
            {p.featured && <div className="ig-price-badge">Most popular</div>}
            <div className="ig-price-name">{p.name}</div>
            <div className="ig-price-blurb">{p.blurb}</div>
            <div className="ig-price-num">
              {p.monthly ? (
                <>
                  <span className="ig-price-dollar">$</span>
                  <span className="ig-price-val">{yearly ? p.yearly : p.monthly}</span>
                  <span className="ig-price-per">/mo</span>
                </>
              ) : (
                <span className="ig-price-val">Custom</span>
              )}
            </div>
            <button
              className={p.featured ? "ig-primary-btn ig-primary-btn-lg" : "ig-ghost-btn ig-ghost-btn-lg"}
              style={{ width: "100%" }}
              onClick={onSignIn}
            >
              {p.cta}
            </button>
            <ul className="ig-price-features">
              {p.features.map((f) => (
                <li key={f}><span className="ig-check">✓</span>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

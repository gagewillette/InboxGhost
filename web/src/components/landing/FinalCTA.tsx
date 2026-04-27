import FinalCTAButton from "./CTAButton";
import { GhostLogo } from "./GhostLogo";

export default function FinalCTA({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section id="cta" className="ig-cta">
      <div className="ig-cta-ghost" aria-hidden>
        <GhostLogo size={260} stroke={1.2} glow />
      </div>
      <div className="ig-cta-inner">
        <div className="ig-kicker">{"//"} Ready when you are</div>
        <h2 className="ig-h2">
          Hand the inbox to the <em>ghost.</em>
          <br /> Get your mornings back.
        </h2>
        <p className="ig-section-sub">
          14 days free, no card required. Takes about 90 seconds to connect Gmail and train your voice.
        </p>
        <div className="ig-hero-cta">
          <FinalCTAButton onSignIn={onSignIn} />
          <button className="ig-ghost-btn ig-ghost-btn-lg">Book a walkthrough</button>
        </div>
        <div className="ig-cta-meta">
          No data sold, ever · Cancel in one click · SOC 2 Type II
        </div>
      </div>
    </section>
  );
}

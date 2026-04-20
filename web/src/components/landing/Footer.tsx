import { GhostWordmark } from "./GhostLogo";

export default function Footer() {
  return (
    <footer className="ig-footer">
      <div className="ig-footer-top">
        <div>
          <GhostWordmark size={16} />
          <p className="ig-footer-tag">A ghost for your inbox. A receipt for your data.</p>
        </div>
        <div className="ig-footer-cols">
          <div>
            <div className="ig-footer-h">Product</div>
            <a href="#how">How it works</a>
            <a href="#transparency">Transparency</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <div className="ig-footer-h">Company</div>
            <a href="#">About</a>
            <a href="#">Manifesto</a>
            <a href="#">Changelog</a>
            <a href="#">Careers</a>
          </div>
          <div>
            <div className="ig-footer-h">Trust</div>
            <a href="#">Data policy</a>
            <a href="#">Security</a>
            <a href="#">Terms</a>
            <a href="#">DPA</a>
          </div>
        </div>
      </div>
      <div className="ig-footer-bot">
        <div>© 2026 InboxGhost Labs · San Francisco</div>
        <div>hello@inboxghost.com</div>
      </div>
    </footer>
  );
}

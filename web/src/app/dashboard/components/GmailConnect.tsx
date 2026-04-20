"use client";

import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { buildGmailAuthUrl } from "../lib/gmail";

type GmailConnectProps = {
  userId: string;
};

export default function GmailConnect({ userId }: GmailConnectProps) {
  const handleConnect = () => {
    window.location.href = buildGmailAuthUrl(userId);
  };

  return (
    <div className="ig-connect-banner">
      <div className="ig-connect-icon">
        <Mail size={20} strokeWidth={1.5} />
      </div>
      <div className="ig-connect-body">
        <p className="ig-connect-title">Connect your Gmail</p>
        <p className="ig-connect-sub">
          Grant read access so InboxGhost can fetch and triage your inbox.
        </p>
      </div>
      <button onClick={handleConnect} className="ig-btn-accent">
        Connect Gmail
      </button>
    </div>
  );
}

export function GmailConnectedBadge() {
  return (
    <div className="ig-connected-badge">
      <CheckCircle size={13} strokeWidth={1.5} />
      <span>Gmail connected</span>
    </div>
  );
}

export function GmailErrorBadge({ message }: { message: string }) {
  return (
    <div className="ig-error-badge">
      <AlertCircle size={13} strokeWidth={1.5} />
      <span>{message}</span>
    </div>
  );
}

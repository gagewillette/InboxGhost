import { Inbox } from "lucide-react";

type EmptyStateProps = {
  onSync: () => Promise<void>;
};

export default function EmptyState({ onSync }: EmptyStateProps) {
  return (
    <div className="ig-empty">
      <Inbox size={40} strokeWidth={1} style={{ color: "var(--ig-fg-muted)" }} />
      <p className="ig-empty-title">No threads yet</p>
      <p className="ig-empty-sub">Sync your inbox to pull in recent emails.</p>
      <button onClick={onSync} className="ig-btn-primary">
        Sync inbox
      </button>
    </div>
  );
}

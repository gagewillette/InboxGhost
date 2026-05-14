"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Plus, Tag } from "lucide-react";
import { supabase } from "@/app/supabase";
import type { UserLabel } from "@/app/types";

const COLORS: { name: string; value: string }[] = [
  { name: "Rose",   value: "oklch(0.74 0.16 10)" },
  { name: "Red",    value: "oklch(0.70 0.17 25)" },
  { name: "Orange", value: "oklch(0.76 0.16 50)" },
  { name: "Amber",  value: "oklch(0.82 0.15 80)" },
  { name: "Lime",   value: "oklch(0.78 0.15 130)" },
  { name: "Green",  value: "oklch(0.72 0.14 145)" },
  { name: "Teal",   value: "oklch(0.76 0.13 175)" },
  { name: "Cyan",   value: "oklch(0.86 0.14 170)" },
  { name: "Blue",   value: "oklch(0.72 0.12 225)" },
  { name: "Indigo", value: "oklch(0.70 0.13 255)" },
  { name: "Violet", value: "oklch(0.78 0.11 290)" },
  { name: "Pink",   value: "oklch(0.80 0.14 340)" },
];

function labelChipStyle(color: string): React.CSSProperties {
  return {
    background: `color-mix(in oklch, ${color} 16%, transparent)`,
    color,
    borderColor: `color-mix(in oklch, ${color} 28%, transparent)`,
  };
}

function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="ig-label-chip" style={labelChipStyle(color)}>
      {name || "label"}
    </span>
  );
}

let tempCounter = 0;
function tempId() {
  return `temp_${++tempCounter}_${Date.now()}`;
}

export default function LabelsSection() {
  const [savedLabels, setSavedLabels] = useState<UserLabel[]>([]);
  const [pendingLabels, setPendingLabels] = useState<UserLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[7].value); // Cyan default

  const pendingRef = useRef<UserLabel[]>([]);
  const savedRef = useRef<UserLabel[]>([]);
  pendingRef.current = pendingLabels;
  savedRef.current = savedLabels;

  const isDirty =
    JSON.stringify(pendingLabels) !== JSON.stringify(savedLabels);
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  const fetchLabels = useCallback(async () => {
    const { data } = await supabase
      .from("user_labels")
      .select("id, name, color, description")
      .order("created_at", { ascending: true });
    const labels: UserLabel[] = data ?? [];
    setSavedLabels(labels);
    setPendingLabels(labels);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const persistToBackend = useCallback(
    async (pending: UserLabel[], saved: UserLabel[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) return;

      const toDelete = saved
        .filter((s) => !pending.some((p) => p.id === s.id))
        .map((l) => l.id);

      const toInsert = pending
        .filter((l) => l.id.startsWith("temp_"))
        .map((l) => ({ name: l.name, color: l.color, user_id: userId }));

      const toUpdate = pending.filter((l) => {
        if (l.id.startsWith("temp_")) return false;
        const orig = saved.find((s) => s.id === l.id);
        return orig && (orig.name !== l.name || orig.color !== l.color);
      });

      const ops: PromiseLike<unknown>[] = [];

      if (toDelete.length > 0) {
        ops.push(supabase.from("user_labels").delete().in("id", toDelete));
      }
      if (toInsert.length > 0) {
        ops.push(supabase.from("user_labels").insert(toInsert));
      }
      for (const label of toUpdate) {
        ops.push(
          supabase
            .from("user_labels")
            .update({ name: label.name, color: label.color })
            .eq("id", label.id)
        );
      }

      await Promise.all(ops as Promise<unknown>[]);
    },
    []
  );

  // Auto-save on unmount if dirty
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        persistToBackend(pendingRef.current, savedRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await persistToBackend(pendingLabels, savedLabels);
    await fetchLabels();
    setSaving(false);
  };

  const handleReset = () => {
    setPendingLabels(savedLabels);
    setNewName("");
    setNewColor(COLORS[7].value);
  };

  const handleAddLabel = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (pendingLabels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) return;

    setPendingLabels((prev) => [
      ...prev,
      { id: tempId(), name: trimmed, color: newColor },
    ]);
    setNewName("");
  };

  const handleDelete = (id: string) => {
    setPendingLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAddLabel();
  };

  return (
    <section className="ig-settings-section">
      <div className="ig-settings-head">
        <h2 className="ig-settings-title">Labels</h2>
        <p className="ig-settings-desc">
          Create labels to organize and classify your emails. Labels appear on
          threads after AI classification runs.
        </p>
      </div>

      {/* Existing labels */}
      {loading ? (
        <div className="ig-label-empty">Loading labels…</div>
      ) : pendingLabels.length === 0 ? (
        <div className="ig-label-empty">
          No labels yet. Create one below.
        </div>
      ) : (
        <div className="ig-label-list">
          {pendingLabels.map((label) => (
            <div key={label.id} className="ig-label-row">
              <LabelChip name={label.name} color={label.color} />
              <span className="ig-label-spacer" />
              <button
                className="ig-label-del"
                onClick={() => handleDelete(label.id)}
                aria-label={`Delete label ${label.name}`}
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Creator */}
      <div className="ig-creator">
        <span className="ig-creator-label">New label</span>

        <div className="ig-creator-row">
          <input
            className="ig-input"
            placeholder="Label name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={32}
          />
          <button
            className="ig-primary-btn-sm"
            onClick={handleAddLabel}
            disabled={!newName.trim()}
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            <Plus size={13} strokeWidth={2} />
            Add
          </button>
        </div>

        {/* Color picker */}
        <div>
          <div className="ig-creator-label" style={{ marginBottom: 8 }}>
            Color
          </div>
          <div className="ig-color-picker">
            {COLORS.map((c) => (
              <button
                key={c.value}
                className={`ig-color-swatch${newColor === c.value ? " is-selected" : ""}`}
                style={{ background: c.value }}
                onClick={() => setNewColor(c.value)}
                title={c.name}
                aria-label={c.name}
                aria-pressed={newColor === c.value}
              />
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="ig-creator-preview">
          <Tag
            size={12}
            strokeWidth={1.5}
            style={{ color: "var(--ig-fg-muted)", flexShrink: 0 }}
          />
          <span className="ig-creator-preview-hint">preview</span>
          <LabelChip
            name={newName.trim() || "label name"}
            color={newColor}
          />
        </div>
      </div>

      {/* Save / Reset */}
      <div className="ig-settings-actions">
        {isDirty && (
          <>
            <span className="ig-dirty-dot" />
            <span className="ig-dirty-label">Unsaved changes</span>
          </>
        )}
        <button
          className="ig-ghost-btn-sm"
          onClick={handleReset}
          disabled={!isDirty || saving}
        >
          Reset
        </button>
        <button
          className="ig-primary-btn-sm"
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? "Saving…" : "Save labels"}
        </button>
      </div>
    </section>
  );
}

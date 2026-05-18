"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Flame, Minus, ChevronDown, Tag, Check } from "lucide-react";
import type { ImportanceFilter, UserLabel } from "@/app/types";

type FilterBarProps = {
  active: ImportanceFilter;
  onChange: (f: ImportanceFilter) => void;
  onRefresh: () => void;
  loading: boolean;
  count: number;
  userLabels: UserLabel[];
  selectedLabels: Set<string>;
  onLabelToggle: (name: string) => void;
  onLabelClear: () => void;
};

const FILTERS: { value: ImportanceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "med", label: "Medium" },
  { value: "low", label: "Low" },
];

function LabelDropdown({
  userLabels,
  selectedLabels,
  onToggle,
  onClear,
}: {
  userLabels: UserLabel[];
  selectedLabels: Set<string>;
  onToggle: (name: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeCount = selectedLabels.size;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (userLabels.length === 0) return null;

  return (
    <div className="ig-label-dropdown" ref={ref}>
      <button
        className={`ig-pill ig-pill--label-trigger${activeCount > 0 ? " ig-pill--active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Tag size={12} strokeWidth={1.5} />
        Labels
        {activeCount > 0 && <span className="ig-pill-badge">{activeCount}</span>}
        <ChevronDown size={11} strokeWidth={2} className={`ig-pill-chevron${open ? " ig-pill-chevron--open" : ""}`} />
      </button>

      {open && (
        <div className="ig-label-dropdown-panel" role="listbox" aria-multiselectable="true">
          {userLabels.map((label) => {
            const selected = selectedLabels.has(label.name);
            const chipStyle = label.color
              ? {
                  background: `color-mix(in oklch, ${label.color} 16%, transparent)`,
                  color: label.color,
                  borderColor: `color-mix(in oklch, ${label.color} 28%, transparent)`,
                }
              : undefined;
            return (
              <button
                key={label.name}
                className={`ig-label-dropdown-item${selected ? " ig-label-dropdown-item--selected" : ""}`}
                role="option"
                aria-selected={selected}
                onClick={() => onToggle(label.name)}
              >
                <span className="ig-label-dropdown-check">
                  {selected && <Check size={11} strokeWidth={2.5} />}
                </span>
                <span className="ig-thread-label-chip" style={chipStyle}>
                  {label.name}
                </span>
              </button>
            );
          })}

          {activeCount > 0 && (
            <>
              <div className="ig-label-dropdown-divider" />
              <button className="ig-label-dropdown-clear" onClick={() => { onClear(); setOpen(false); }}>
                Clear filter
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({
  active, onChange, onRefresh, loading, count,
  userLabels, selectedLabels, onLabelToggle, onLabelClear,
}: FilterBarProps) {
  return (
    <div className="ig-filter-bar">
      <div className="ig-filter-pills">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`ig-pill${active === f.value ? " ig-pill--active" : ""}`}
            aria-pressed={active === f.value}
          >
            {f.value === "high" && <Flame size={13} strokeWidth={1.5} />}
            {f.value === "med" && <Minus size={13} strokeWidth={1.5} />}
            {f.value === "low" && <ChevronDown size={13} strokeWidth={1.5} />}
            {f.label}
          </button>
        ))}

        <LabelDropdown
          userLabels={userLabels}
          selectedLabels={selectedLabels}
          onToggle={onLabelToggle}
          onClear={onLabelClear}
        />
      </div>

      <div className="ig-filter-right">
        <span className="ig-count">{count} thread{count !== 1 ? "s" : ""}</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh inbox"
          className="ig-icon-btn"
        >
          <RefreshCw size={15} strokeWidth={1.5} className={loading ? "ig-spin" : ""} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { RefreshCw, Flame, Minus, ChevronDown } from "lucide-react";
import type { ImportanceFilter } from "@/app/types";

type FilterBarProps = {
  active: ImportanceFilter;
  onChange: (f: ImportanceFilter) => void;
  onRefresh: () => void;
  loading: boolean;
  count: number;
};

const FILTERS: { value: ImportanceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "med", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function FilterBar({ active, onChange, onRefresh, loading, count }: FilterBarProps) {
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

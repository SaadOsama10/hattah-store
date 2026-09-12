"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

/** A reorderable tag-list editor — reused for both the "sizes" and
 * "colors" variant lists in the product form. */
export function VariantListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-2xl border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
        />
        <button
          type="button"
          onClick={addItem}
          className="flex shrink-0 items-center gap-1 rounded-2xl border border-cream/20 px-3 py-2 font-inter text-sm text-cream transition-colors hover:border-forest hover:text-forest"
        >
          <Plus size={14} />
          {addLabel}
        </button>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="flex items-center gap-1 rounded-full border border-cream/15 bg-bg-primary py-1 ps-3 pe-1.5 font-inter text-sm text-cream"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => moveItem(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="flex h-5 w-5 items-center justify-center rounded-full text-cream-secondary/60 transition-colors hover:text-cream disabled:opacity-30"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => moveItem(i, 1)}
                disabled={i === items.length - 1}
                aria-label="Move down"
                className="flex h-5 w-5 items-center justify-center rounded-full text-cream-secondary/60 transition-colors hover:text-cream disabled:opacity-30"
              >
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => removeItem(i)}
                aria-label="Remove"
                className="flex h-5 w-5 items-center justify-center rounded-full text-cream-secondary/60 transition-colors hover:text-terracotta-deep"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

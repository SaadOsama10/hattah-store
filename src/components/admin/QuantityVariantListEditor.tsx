"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

export interface QuantityEntry {
  label_ar: string;
  label_en: string;
  label_tr: string;
  price: number;
}

/** Like ColorVariantListEditor, but each entry also carries its own
 * price — the whole point of a quantity option ("250g" = 150, "1kg" =
 * 500) is that it's priced independently of the product's base price. */
export function QuantityVariantListEditor({
  items,
  onChange,
  placeholders,
  priceLabel,
  pricePlaceholder,
  addLabel,
  currency,
}: {
  items: QuantityEntry[];
  onChange: (items: QuantityEntry[]) => void;
  placeholders: { ar: string; en: string; tr: string };
  priceLabel: string;
  pricePlaceholder: string;
  addLabel: string;
  currency: string;
}) {
  const [draftAr, setDraftAr] = useState("");
  const [draftEn, setDraftEn] = useState("");
  const [draftTr, setDraftTr] = useState("");
  const [draftPrice, setDraftPrice] = useState("");

  function addItem() {
    const label_ar = draftAr.trim();
    const label_en = draftEn.trim();
    const label_tr = draftTr.trim();
    const price = Number(draftPrice);
    if (!label_ar || !label_en || !label_tr || !draftPrice || !Number.isFinite(price) || price <= 0) {
      return;
    }
    onChange([...items, { label_ar, label_en, label_tr, price }]);
    setDraftAr("");
    setDraftEn("");
    setDraftTr("");
    setDraftPrice("");
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input
          type="text"
          dir="rtl"
          value={draftAr}
          onChange={(e) => setDraftAr(e.target.value)}
          placeholder={placeholders.ar}
          className="rounded-2xl border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
        />
        <input
          type="text"
          value={draftEn}
          onChange={(e) => setDraftEn(e.target.value)}
          placeholder={placeholders.en}
          className="rounded-2xl border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
        />
        <input
          type="text"
          value={draftTr}
          onChange={(e) => setDraftTr(e.target.value)}
          placeholder={placeholders.tr}
          className="rounded-2xl border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={draftPrice}
          onChange={(e) => setDraftPrice(e.target.value)}
          placeholder={`${pricePlaceholder} (${priceLabel})`}
          className="rounded-2xl border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-2 flex items-center gap-1 rounded-2xl border border-cream/20 px-3 py-2 font-inter text-sm text-cream transition-colors hover:border-forest hover:text-forest"
      >
        <Plus size={14} />
        {addLabel}
      </button>

      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li
              key={`${item.label_en}-${i}`}
              className="flex items-center gap-1.5 rounded-full border border-cream/15 bg-bg-primary py-1 ps-3 pe-1.5 font-inter text-sm text-cream"
            >
              <span dir="rtl">{item.label_ar}</span>
              <span className="text-cream-secondary/40">/</span>
              <span>{item.label_en}</span>
              <span className="text-cream-secondary/40">/</span>
              <span>{item.label_tr}</span>
              <span className="text-cream-secondary/40">—</span>
              <span className="text-terracotta">
                {currency} {item.price.toLocaleString()}
              </span>
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

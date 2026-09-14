"use client";

import { useTranslations } from "next-intl";
import { CATEGORY_ICONS, CATEGORY_ICON_KEYS } from "@/lib/categoryIcons";
import { cn } from "@/lib/cn";

/** A clickable grid of the fixed category-icon set (see
 * src/lib/categoryIcons.ts) — deliberately not a text dropdown, so the
 * admin picks by recognizing the icon itself. */
export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (iconKey: string) => void;
}) {
  const t = useTranslations("admin.categories.icons");

  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
      {CATEGORY_ICON_KEYS.map((iconKey) => {
        const Icon = CATEGORY_ICONS[iconKey];
        const selected = value === iconKey;
        const label = t(iconKey as "shirt");
        return (
          <button
            key={iconKey}
            type="button"
            onClick={() => onChange(iconKey)}
            aria-label={label}
            aria-pressed={selected}
            title={label}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
              selected
                ? "border-terracotta bg-terracotta/15 text-terracotta"
                : "border-cream/15 text-cream-secondary hover:border-cream/40 hover:text-cream"
            )}
          >
            <Icon size={18} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}

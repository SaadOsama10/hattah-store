"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, X, Check, ChevronDown, CornerDownRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { CategoryDeleteModal } from "@/components/admin/CategoryDeleteModal";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { buildCategoryTree } from "@/lib/categories";
import { cn } from "@/lib/cn";
import type { CategoryRow } from "@/lib/supabase/types";

interface FieldsState {
  label_ar: string;
  label_en: string;
  label_tr: string;
  parent_key: string;
}

const EMPTY_FIELDS: FieldsState = { label_ar: "", label_en: "", label_tr: "", parent_key: "" };

function toFormData(fields: FieldsState) {
  const fd = new FormData();
  fd.set("label_ar", fields.label_ar);
  fd.set("label_en", fields.label_en);
  fd.set("label_tr", fields.label_tr);
  fd.set("parent_key", fields.parent_key);
  return fd;
}

export function CategoryManager({
  categories,
  productCounts,
}: {
  categories: CategoryRow[];
  productCounts: Record<string, number>;
}) {
  const t = useTranslations("admin.categories");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newFields, setNewFields] = useState<FieldsState>(EMPTY_FIELDS);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<FieldsState>(EMPTY_FIELDS);

  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = buildCategoryTree(categories);
  const topLevelCategories = categories.filter((c) => !c.parent_key);

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startEdit(cat: CategoryRow) {
    setEditingKey(cat.key);
    setEditFields({
      label_ar: cat.label_ar,
      label_en: cat.label_en,
      label_tr: cat.label_tr,
      parent_key: cat.parent_key ?? "",
    });
    setIsAdding(false);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createCategory(toFormData(newFields));
        setNewFields(EMPTY_FIELDS);
        setIsAdding(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("genericError"));
      }
    });
  }

  function handleUpdate(e: React.FormEvent, key: string) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await updateCategory(key, toFormData(editFields));
        setEditingKey(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("genericError"));
      }
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setError(null);
    try {
      const result = await deleteCategory(deleteTarget.key);
      if (!result.success) {
        // Rare race condition: a product/subcategory was linked after the page loaded.
        setError(
          `${t("linkedProductsCount", { count: result.productCount })} · ${t("linkedSubcategoriesCount", { count: result.subcategoryCount })}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setDeleteTarget(null);
      router.refresh();
    }
  }

  // A parent's effective count includes products filed on it directly plus
  // every one of its subcategories' products — matches the storefront's
  // "select the parent -> see everything underneath" filtering behavior.
  function effectiveCount(cat: CategoryRow): number {
    const direct = productCounts[cat.key] ?? 0;
    if (cat.parent_key) return direct;
    const childKeys = categories.filter((c) => c.parent_key === cat.key).map((c) => c.key);
    return direct + childKeys.reduce((sum, k) => sum + (productCounts[k] ?? 0), 0);
  }

  function deleteTargetSubcategoryCount(cat: CategoryRow): number {
    return categories.filter((c) => c.parent_key === cat.key).length;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-cream">{t("title")}</h1>
          <p className="mt-1 font-inter text-sm text-cream-secondary/60">{t("subtitle")}</p>
        </div>
        {!isAdding && (
          <Button
            variant="primary"
            onClick={() => {
              setIsAdding(true);
              setEditingKey(null);
              setNewFields(EMPTY_FIELDS);
            }}
          >
            <Plus size={16} />
            {t("addNew")}
          </Button>
        )}
      </div>

      {error && <p className="mb-4 font-inter text-sm text-terracotta-deep">{error}</p>}

      {isAdding && (
        <div className="mb-8 rounded-2xl border border-cream/15 bg-bg-secondary p-6">
          <h2 className="mb-4 font-playfair text-lg font-bold text-cream">{t("addNew")}</h2>
          <form onSubmit={handleCreate}>
            <CategoryTypeAndParent
              t={t}
              topLevelCategories={topLevelCategories}
              value={newFields.parent_key}
              onChange={(v) => setNewFields((f) => ({ ...f, parent_key: v }))}
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <CategoryInput
                label={t("labelAr")}
                dir="rtl"
                value={newFields.label_ar}
                onChange={(v) => setNewFields((f) => ({ ...f, label_ar: v }))}
              />
              <CategoryInput
                label={t("labelEn")}
                value={newFields.label_en}
                onChange={(v) => setNewFields((f) => ({ ...f, label_en: v }))}
              />
              <CategoryInput
                label={t("labelTr")}
                value={newFields.label_tr}
                onChange={(v) => setNewFields((f) => ({ ...f, label_tr: v }))}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <Button type="submit" size="md" disabled={isPending}>
                {t("save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsAdding(false)}
                disabled={isPending}
              >
                {t("deleteCancel")}
              </Button>
            </div>
          </form>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream/15 py-24 text-center">
          <p className="font-inter text-cream-secondary/60">{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cream/10">
          <table className="w-full min-w-[760px] border-collapse text-start">
            <thead>
              <tr className="border-b border-cream/10 bg-bg-secondary">
                <th className="px-5 py-3 text-start font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                  {t("labelAr")}
                </th>
                <th className="px-5 py-3 text-start font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                  {t("labelEn")}
                </th>
                <th className="px-5 py-3 text-start font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                  {t("labelTr")}
                </th>
                <th className="px-5 py-3 text-start font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                  {t("linkedProducts")}
                </th>
                <th className="px-5 py-3 text-end font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tree.map((parent) => {
                const rows: { cat: CategoryRow; depth: 0 | 1 }[] = [{ cat: parent, depth: 0 }];
                const isCollapsed = collapsed.has(parent.key);
                if (!isCollapsed) {
                  for (const child of parent.children) {
                    rows.push({ cat: child, depth: 1 });
                  }
                }

                return rows.map(({ cat, depth }) => {
                  const isEditing = editingKey === cat.key;
                  const hasChildren = depth === 0 && parent.children.length > 0;
                  const count = effectiveCount(cat);

                  if (isEditing) {
                    return (
                      <tr key={cat.key} className="border-b border-cream/5 last:border-0">
                        <td colSpan={5} className="px-5 py-4">
                          <form onSubmit={(e) => handleUpdate(e, cat.key)}>
                            <CategoryTypeAndParent
                              t={t}
                              topLevelCategories={topLevelCategories.filter(
                                (c) => c.key !== cat.key
                              )}
                              value={editFields.parent_key}
                              onChange={(v) => setEditFields((f) => ({ ...f, parent_key: v }))}
                            />
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                                <CategoryInput
                                  label={t("labelAr")}
                                  dir="rtl"
                                  value={editFields.label_ar}
                                  onChange={(v) =>
                                    setEditFields((f) => ({ ...f, label_ar: v }))
                                  }
                                />
                                <CategoryInput
                                  label={t("labelEn")}
                                  value={editFields.label_en}
                                  onChange={(v) =>
                                    setEditFields((f) => ({ ...f, label_en: v }))
                                  }
                                />
                                <CategoryInput
                                  label={t("labelTr")}
                                  value={editFields.label_tr}
                                  onChange={(v) =>
                                    setEditFields((f) => ({ ...f, label_tr: v }))
                                  }
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={isPending}
                                  aria-label="Save"
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-forest/40 text-forest transition-colors hover:bg-forest/10"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingKey(null)}
                                  aria-label="Cancel"
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:bg-cream/5"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={cat.key} className="border-b border-cream/5 last:border-0">
                      <td className="px-5 py-3 font-inter text-sm text-cream" dir="rtl">
                        <span
                          className="flex items-center gap-2"
                          style={depth === 1 ? { paddingInlineStart: "1.5rem" } : undefined}
                        >
                          {depth === 1 && (
                            <CornerDownRight size={14} className="shrink-0 text-cream-secondary/40" />
                          )}
                          {hasChildren && (
                            <button
                              type="button"
                              onClick={() => toggleCollapsed(cat.key)}
                              aria-label={isCollapsed ? t("expand") : t("collapse")}
                              className="shrink-0 text-cream-secondary/60 transition-transform hover:text-cream"
                            >
                              <ChevronDown
                                size={14}
                                className={cn("transition-transform", isCollapsed && "-rotate-90")}
                              />
                            </button>
                          )}
                          {cat.label_ar}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-inter text-sm text-cream">{cat.label_en}</td>
                      <td className="px-5 py-3 font-inter text-sm text-cream">{cat.label_tr}</td>
                      <td className="px-5 py-3 font-inter text-sm text-cream-secondary/70">
                        {t("linkedProductsCount", { count })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            aria-label="Edit"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:border-forest hover:text-forest"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(cat)}
                            aria-label="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:border-terracotta-deep hover:text-terracotta-deep"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <CategoryDeleteModal
          categoryName={deleteTarget.label_ar}
          productCount={effectiveCount(deleteTarget)}
          subcategoryCount={deleteTargetSubcategoryCount(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function CategoryTypeAndParent({
  t,
  topLevelCategories,
  value,
  onChange,
}: {
  t: ReturnType<typeof useTranslations<"admin.categories">>;
  topLevelCategories: CategoryRow[];
  value: string;
  onChange: (value: string) => void;
}) {
  const isSubcategory = value !== "";

  return (
    <div>
      <label className="mb-1.5 block font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
        {t("categoryType")}
      </label>
      <div className="mb-3 inline-flex rounded-full border border-cream/20 bg-bg-primary p-1">
        <button
          type="button"
          onClick={() => onChange("")}
          className={cn(
            "rounded-full px-4 py-1.5 font-inter text-xs transition-colors",
            !isSubcategory ? "bg-terracotta text-cream" : "text-cream-secondary hover:text-cream"
          )}
        >
          {t("topLevelOption")}
        </button>
        <button
          type="button"
          onClick={() => onChange(topLevelCategories[0]?.key ?? "")}
          disabled={topLevelCategories.length === 0}
          className={cn(
            "rounded-full px-4 py-1.5 font-inter text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            isSubcategory ? "bg-terracotta text-cream" : "text-cream-secondary hover:text-cream"
          )}
        >
          {t("subcategoryOption")}
        </button>
      </div>

      {isSubcategory &&
        (topLevelCategories.length === 0 ? (
          <p className="font-inter text-xs text-cream-secondary/60">{t("noParentAvailable")}</p>
        ) : (
          <div>
            <label className="mb-1.5 block font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
              {t("parentCategoryLabel")}
            </label>
            <select
              required
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full max-w-xs rounded-2xl border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
            >
              <option value="" disabled>
                {t("selectParentPlaceholder")}
              </option>
              {topLevelCategories.map((cat) => (
                <option key={cat.key} value={cat.key} className="bg-bg-primary">
                  {cat.label_ar}
                </option>
              ))}
            </select>
          </div>
        ))}
    </div>
  );
}

function CategoryInput({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div>
      <label className="mb-1.5 block font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
        {label}
      </label>
      <input
        type="text"
        required
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
      />
    </div>
  );
}

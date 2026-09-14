"use client";

import { Fragment, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { ImageDropzone, type ExistingImage } from "@/components/admin/ImageDropzone";
import { VariantListEditor } from "@/components/admin/VariantListEditor";
import { ColorVariantListEditor, type ColorEntry } from "@/components/admin/ColorVariantListEditor";
import { QuantityVariantListEditor, type QuantityEntry } from "@/components/admin/QuantityVariantListEditor";
import { createProduct, updateProduct } from "@/actions/products";
import { localizeCategory, type CategoryRow, type CategoryKey, type Locale } from "@/lib/supabase/types";
import { buildCategoryTree } from "@/lib/categories";

export interface ProductFormInitialData {
  id: string;
  name_ar: string;
  name_en: string;
  name_tr: string;
  description_ar: string;
  description_en: string;
  description_tr: string;
  price: number;
  category: CategoryKey;
  is_featured: boolean;
  has_sizes: boolean;
  has_colors: boolean;
  has_quantities: boolean;
  sizes: string[];
  colors: ColorEntry[];
  quantities: QuantityEntry[];
  images: ExistingImage[];
}

export function ProductForm({
  mode,
  categories,
  initialData,
}: {
  mode: "create" | "edit";
  categories: CategoryRow[];
  initialData?: ProductFormInitialData;
}) {
  const t = useTranslations("admin.form");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    name_ar: initialData?.name_ar ?? "",
    name_en: initialData?.name_en ?? "",
    name_tr: initialData?.name_tr ?? "",
    description_ar: initialData?.description_ar ?? "",
    description_en: initialData?.description_en ?? "",
    description_tr: initialData?.description_tr ?? "",
    price: initialData?.price ?? 0,
    category: initialData?.category ?? ("" as CategoryKey | ""),
    is_featured: initialData?.is_featured ?? false,
    has_sizes: initialData?.has_sizes ?? false,
    has_colors: initialData?.has_colors ?? false,
    has_quantities: initialData?.has_quantities ?? false,
  });

  const [sizes, setSizes] = useState<string[]>(initialData?.sizes ?? []);
  const [colors, setColors] = useState<ColorEntry[]>(initialData?.colors ?? []);
  const [quantities, setQuantities] = useState<QuantityEntry[]>(initialData?.quantities ?? []);

  const [existingImages, setExistingImages] = useState<ExistingImage[]>(
    initialData?.images ?? []
  );
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const categoryTree = buildCategoryTree(categories);

  function update<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function removeExistingImage(id: string) {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setRemovedImageIds((prev) => [...prev, id]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name_ar", fields.name_ar);
    formData.set("name_en", fields.name_en);
    formData.set("name_tr", fields.name_tr);
    formData.set("description_ar", fields.description_ar);
    formData.set("description_en", fields.description_en);
    formData.set("description_tr", fields.description_tr);
    formData.set("price", String(fields.price));
    formData.set("category", fields.category);
    if (fields.is_featured) formData.set("is_featured", "on");
    if (fields.has_sizes) {
      formData.set("has_sizes", "on");
      sizes.forEach((size) => formData.append("sizes", size));
    }
    if (fields.has_colors) {
      formData.set("has_colors", "on");
      formData.set("colors_json", JSON.stringify(colors));
    }
    if (fields.has_quantities) {
      formData.set("has_quantities", "on");
      formData.set("quantities_json", JSON.stringify(quantities));
    }
    newFiles.forEach((file) => formData.append("images", file));

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createProduct(formData);
        } else if (initialData) {
          await updateProduct(initialData.id, formData, removedImageIds);
        }
        router.push("/admin");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-10">
      <div>
        <label className="mb-3 block font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
          {t("images")}
        </label>
        <ImageDropzone
          existingImages={existingImages}
          onRemoveExisting={removeExistingImage}
          newFiles={newFiles}
          onNewFilesChange={setNewFiles}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
            {t("category")}
          </label>
          <select
            required
            value={fields.category}
            onChange={(e) => update("category", e.target.value as CategoryKey)}
            className="w-full rounded-2xl border border-cream/20 bg-bg-secondary px-4 py-3 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
          >
            <option value="" disabled>
              {t("selectCategory")}
            </option>
            {categoryTree.map((parent) => (
              <Fragment key={parent.key}>
                <option value={parent.key} className="bg-bg-secondary">
                  {localizeCategory(parent, locale)}
                </option>
                {parent.children.map((child) => (
                  <option key={child.key} value={child.key} className="bg-bg-secondary">
                    {"— "}
                    {localizeCategory(child, locale)}
                  </option>
                ))}
              </Fragment>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
            {t("price")}
          </label>
          <input
            type="number"
            required
            min={0}
            step="0.01"
            value={fields.price}
            onChange={(e) => update("price", Number(e.target.value))}
            className="w-full rounded-2xl border border-cream/20 bg-bg-secondary px-4 py-3 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <Toggle
            checked={fields.is_featured}
            onChange={(v) => update("is_featured", v)}
            label={t("isFeatured")}
            description={t("isFeaturedHint")}
          />
        </div>

        <div className="sm:col-span-2">
          <Toggle
            checked={fields.has_sizes}
            onChange={(v) => update("has_sizes", v)}
            label={t("hasSizes")}
            description={t("hasSizesHint")}
          />
          {fields.has_sizes && (
            <div className="mt-3">
              <VariantListEditor
                items={sizes}
                onChange={setSizes}
                placeholder={t("addSizePlaceholder")}
                addLabel={tCommon("add")}
              />
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <Toggle
            checked={fields.has_colors}
            onChange={(v) => update("has_colors", v)}
            label={t("hasColors")}
            description={t("hasColorsHint")}
          />
          {fields.has_colors && (
            <div className="mt-3">
              <ColorVariantListEditor
                items={colors}
                onChange={setColors}
                placeholders={{
                  ar: t("addColorPlaceholderAr"),
                  en: t("addColorPlaceholderEn"),
                  tr: t("addColorPlaceholderTr"),
                }}
                addLabel={tCommon("add")}
              />
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <Toggle
            checked={fields.has_quantities}
            onChange={(v) => update("has_quantities", v)}
            label={t("hasQuantities")}
            description={t("hasQuantitiesHint")}
          />
          {fields.has_quantities && (
            <div className="mt-3">
              <QuantityVariantListEditor
                items={quantities}
                onChange={setQuantities}
                placeholders={{
                  ar: t("addQuantityPlaceholderAr"),
                  en: t("addQuantityPlaceholderEn"),
                  tr: t("addQuantityPlaceholderTr"),
                }}
                priceLabel={t("price")}
                pricePlaceholder={t("quantityPricePlaceholder")}
                addLabel={tCommon("add")}
                currency={tCommon("currency")}
              />
            </div>
          )}
        </div>

        <FormField label={t("nameAr")} dir="rtl" value={fields.name_ar} onChange={(v) => update("name_ar", v)} />
        <FormField label={t("nameEn")} value={fields.name_en} onChange={(v) => update("name_en", v)} />
        <FormField label={t("nameTr")} value={fields.name_tr} onChange={(v) => update("name_tr", v)} />

        <FormField
          label={t("descAr")}
          dir="rtl"
          value={fields.description_ar}
          onChange={(v) => update("description_ar", v)}
          textarea
          className="sm:col-span-2"
        />
        <FormField
          label={t("descEn")}
          value={fields.description_en}
          onChange={(v) => update("description_en", v)}
          textarea
          className="sm:col-span-2"
        />
        <FormField
          label={t("descTr")}
          value={fields.description_tr}
          onChange={(v) => update("description_tr", v)}
          textarea
          className="sm:col-span-2"
        />
      </div>

      {error && <p className="font-inter text-sm text-terracotta-deep">{error}</p>}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("saving") : mode === "create" ? t("submit") : t("submitEdit")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin")}>
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}

function FormField({
  label,
  value,
  onChange,
  dir,
  textarea,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl" | "ltr";
  textarea?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
        {label}
      </label>
      {textarea ? (
        <textarea
          required
          dir={dir}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-none rounded-2xl border border-cream/20 bg-bg-secondary px-4 py-3 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
        />
      ) : (
        <input
          type="text"
          required
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-cream/20 bg-bg-secondary px-4 py-3 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
        />
      )}
    </div>
  );
}

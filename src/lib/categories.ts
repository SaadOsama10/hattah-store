import type { CategoryKey, CategoryRow } from "@/lib/supabase/types";

export interface CategoryNode extends CategoryRow {
  children: CategoryRow[];
}

/** Groups a flat category list into top-level categories with their
 * direct subcategories attached — the shape the admin/shop UIs render. */
export function buildCategoryTree(categories: CategoryRow[]): CategoryNode[] {
  const childrenByParent = new Map<CategoryKey, CategoryRow[]>();
  for (const cat of categories) {
    if (!cat.parent_key) continue;
    const siblings = childrenByParent.get(cat.parent_key) ?? [];
    siblings.push(cat);
    childrenByParent.set(cat.parent_key, siblings);
  }

  return categories
    .filter((cat) => !cat.parent_key)
    .map((cat) => ({ ...cat, children: childrenByParent.get(cat.key) ?? [] }));
}

/** A category key plus, when it's a top-level category, every one of its
 * subcategory keys — used to match products against a parent filter so
 * choosing "Clothing" also surfaces products filed under "Thobes". */
export function getDescendantKeys(
  categories: CategoryRow[],
  key: CategoryKey
): CategoryKey[] {
  const keys = [key];
  for (const cat of categories) {
    if (cat.parent_key === key) keys.push(cat.key);
  }
  return keys;
}

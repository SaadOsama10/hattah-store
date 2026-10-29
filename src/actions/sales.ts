"use server";

import { assertAdminSession } from "@/lib/admin-auth";
import { getServiceSupabaseClient } from "@/lib/supabase/service";
import type { SaleWithItems } from "@/lib/supabase/types";

export async function listSales(): Promise<SaleWithItems[]> {
  await assertAdminSession();
  const { data, error } = await getServiceSupabaseClient()
    .from("sales")
    .select("*, sale_items(*)")
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SaleWithItems[];
}

export interface SaleInput {
  sale_date: string;
  total_try: number;
  notes: string;
  items: { item_name: string; quantity: number; unit_price: number | null }[];
}

function validate(input: SaleInput) {
  if (!input.sale_date) throw new Error("التاريخ مطلوب");
  if (!Number.isFinite(input.total_try) || input.total_try < 0) throw new Error("مجموع غير صالح");
  const items = input.items.filter((i) => i.item_name.trim());
  if (items.length === 0) throw new Error("أضف صنفًا واحدًا على الأقل");
  for (const i of items) {
    if (!Number.isFinite(i.quantity) || i.quantity <= 0) throw new Error("كمية غير صالحة");
  }
  for (const i of items) {
    if (i.unit_price != null && (!Number.isFinite(i.unit_price) || i.unit_price < 0)) {
      throw new Error("سعر وحدة غير صالح");
    }
  }
  return items.map((i) => ({ item_name: i.item_name.trim(), quantity: i.quantity, unit_price: i.unit_price }));
}

/** Items are matched to a storefront product only on an exact Arabic-name
 * hit; anything else stays name-only. */
async function resolveProductIds(names: string[]): Promise<Map<string, string>> {
  const { data } = await getServiceSupabaseClient().from("products").select("id, name_ar");
  const map = new Map<string, string>();
  for (const p of data ?? []) {
    for (const n of names) if (p.name_ar === n) map.set(n, p.id);
  }
  return map;
}

async function writeItems(saleId: string, items: { item_name: string; quantity: number; unit_price: number | null }[]) {
  const supabase = getServiceSupabaseClient();
  const ids = await resolveProductIds(items.map((i) => i.item_name));
  const { error } = await supabase.from("sale_items").insert(
    items.map((i) => ({ ...i, sale_id: saleId, product_id: ids.get(i.item_name) ?? null }))
  );
  if (error) throw new Error(error.message);
}

export async function createSale(input: SaleInput): Promise<void> {
  await assertAdminSession();
  const items = validate(input);
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("sales")
    .insert({ sale_date: input.sale_date, total_try: input.total_try, notes: input.notes.trim() || null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await writeItems(data.id, items);
}

export async function updateSale(id: string, input: SaleInput): Promise<void> {
  await assertAdminSession();
  const items = validate(input);
  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("sales")
    .update({ sale_date: input.sale_date, total_try: input.total_try, notes: input.notes.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  const del = await supabase.from("sale_items").delete().eq("sale_id", id);
  if (del.error) throw new Error(del.error.message);
  await writeItems(id, items);
}

export async function deleteSale(id: string): Promise<void> {
  await assertAdminSession();
  const { error } = await getServiceSupabaseClient().from("sales").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

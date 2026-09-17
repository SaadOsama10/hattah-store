"use server";

import { assertAdminSession } from "@/lib/admin-auth";
import { getServiceSupabaseClient } from "@/lib/supabase/service";
import type { InventoryEntryRow, InventoryStatus } from "@/lib/supabase/types";

const VALID_STATUSES: InventoryStatus[] = ["in_stock", "sold_out", "partially_sold"];

/** Internal ledger data — never exposed to the storefront, never read
 * through the public anon key (see the RLS comment in schema.sql). Only
 * ever called from the admin-session-gated inventory page/actions. */
export async function listInventoryEntries(): Promise<InventoryEntryRow[]> {
  await assertAdminSession();

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_log")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryEntryRow[];
}

interface InventoryFields {
  entry_date: string;
  item_description: string;
  quantity: number;
  unit_cost: number;
  status: InventoryStatus;
  quantity_sold: number;
  unit_sale_price: number | null;
  last_sale_date: string | null;
  notes: string | null;
}

function readFields(formData: FormData): InventoryFields {
  const status = String(formData.get("status") ?? "in_stock");
  const unitSalePriceRaw = String(formData.get("unit_sale_price") ?? "").trim();
  const lastSaleDateRaw = String(formData.get("last_sale_date") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();

  return {
    entry_date: String(formData.get("entry_date") ?? "").trim(),
    item_description: String(formData.get("item_description") ?? "").trim(),
    quantity: Number(formData.get("quantity") ?? 0),
    unit_cost: Number(formData.get("unit_cost") ?? 0),
    status: VALID_STATUSES.includes(status as InventoryStatus)
      ? (status as InventoryStatus)
      : "in_stock",
    quantity_sold: Number(formData.get("quantity_sold") ?? 0),
    unit_sale_price: unitSalePriceRaw ? Number(unitSalePriceRaw) : null,
    last_sale_date: lastSaleDateRaw || null,
    notes: notesRaw || null,
  };
}

function assertValidFields(fields: InventoryFields) {
  if (!fields.entry_date || !fields.item_description) {
    throw new Error("Missing required fields");
  }
  if (!Number.isFinite(fields.quantity) || fields.quantity < 0) {
    throw new Error("Invalid quantity");
  }
  if (!Number.isFinite(fields.unit_cost) || fields.unit_cost < 0) {
    throw new Error("Invalid unit cost");
  }
  if (!Number.isFinite(fields.quantity_sold) || fields.quantity_sold < 0) {
    throw new Error("Invalid quantity sold");
  }
  if (fields.unit_sale_price != null && fields.unit_sale_price < 0) {
    throw new Error("Invalid unit sale price");
  }
}

export async function createInventoryEntry(formData: FormData): Promise<{ id: string }> {
  await assertAdminSession();

  const fields = readFields(formData);
  assertValidFields(fields);

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_log")
    .insert(fields)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function updateInventoryEntry(id: string, formData: FormData): Promise<void> {
  await assertAdminSession();

  const fields = readFields(formData);
  assertValidFields(fields);

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.from("inventory_log").update(fields).eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteInventoryEntry(id: string): Promise<void> {
  await assertAdminSession();

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.from("inventory_log").delete().eq("id", id);

  if (error) throw new Error(error.message);
}

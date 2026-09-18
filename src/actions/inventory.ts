"use server";

import { assertAdminSession } from "@/lib/admin-auth";
import { getServiceSupabaseClient } from "@/lib/supabase/service";
import type {
  InventoryBatchWithEntries,
  InventoryStatus,
} from "@/lib/supabase/types";

const VALID_STATUSES: InventoryStatus[] = ["in_stock", "sold_out", "partially_sold"];

/** Internal ledger data — never exposed to the storefront, never read
 * through the public anon key (see the RLS comment in schema.sql). Only
 * ever called from the admin-session-gated inventory page/actions. Each
 * batch comes with its own line items already nested, newest batch and
 * newest line item first. */
export async function listInventoryBatches(): Promise<InventoryBatchWithEntries[]> {
  await assertAdminSession();

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_batches")
    .select("*, inventory_log(*)")
    .order("batch_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const batches = (data ?? []) as unknown as InventoryBatchWithEntries[];
  for (const batch of batches) {
    batch.inventory_log.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return batches;
}

interface BatchFields {
  title: string;
  batch_date: string;
  amount_paid: number;
  notes: string | null;
}

function readBatchFields(formData: FormData): BatchFields {
  const amountPaidRaw = String(formData.get("amount_paid") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  return {
    title: String(formData.get("title") ?? "").trim(),
    batch_date: String(formData.get("batch_date") ?? "").trim(),
    amount_paid: amountPaidRaw ? Number(amountPaidRaw) : 0,
    notes: notesRaw || null,
  };
}

function assertValidBatchFields(fields: BatchFields) {
  if (!fields.title || !fields.batch_date) {
    throw new Error("Missing required fields");
  }
  if (!Number.isFinite(fields.amount_paid) || fields.amount_paid < 0) {
    throw new Error("Invalid amount paid");
  }
}

export async function createInventoryBatch(formData: FormData): Promise<{ id: string }> {
  await assertAdminSession();

  const fields = readBatchFields(formData);
  assertValidBatchFields(fields);

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_batches")
    .insert(fields)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function updateInventoryBatch(id: string, formData: FormData): Promise<void> {
  await assertAdminSession();

  const fields = readBatchFields(formData);
  assertValidBatchFields(fields);

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.from("inventory_batches").update(fields).eq("id", id);

  if (error) throw new Error(error.message);
}

interface InventoryFields {
  batch_id: string;
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
    batch_id: String(formData.get("batch_id") ?? "").trim(),
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
  if (!fields.batch_id) {
    throw new Error("Missing batch");
  }
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

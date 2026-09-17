import { InventoryLog } from "@/components/admin/InventoryLog";
import { listInventoryEntries } from "@/actions/inventory";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const entries = await listInventoryEntries();

  return <InventoryLog entries={entries} />;
}

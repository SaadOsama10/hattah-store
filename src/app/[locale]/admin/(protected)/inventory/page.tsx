import { InventoryLog } from "@/components/admin/InventoryLog";
import { listInventoryBatches } from "@/actions/inventory";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const batches = await listInventoryBatches();

  return <InventoryLog batches={batches} />;
}

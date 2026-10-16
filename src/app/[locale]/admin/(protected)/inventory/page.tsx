import { InventoryLog } from "@/components/admin/InventoryLog";
import { listInventoryBatches } from "@/actions/inventory";
import { parseDateParam } from "@/lib/inventory-period";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const batches = await listInventoryBatches();

  return (
    <InventoryLog batches={batches} range={{ from: parseDateParam(from), to: parseDateParam(to) }} />
  );
}

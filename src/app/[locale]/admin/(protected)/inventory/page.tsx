import { InventoryLog } from "@/components/admin/InventoryLog";
import { listInventoryBatches } from "@/actions/inventory";
import { listSales } from "@/actions/sales";
import { parseDateParam, parseViewParam } from "@/lib/inventory-period";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; view?: string }>;
}) {
  const { from, to, view } = await searchParams;
  const [batches, sales] = await Promise.all([listInventoryBatches(), listSales()]);

  return (
    <InventoryLog
      batches={batches}
      sales={sales}
      range={{ from: parseDateParam(from), to: parseDateParam(to) }}
      view={parseViewParam(view)}
    />
  );
}

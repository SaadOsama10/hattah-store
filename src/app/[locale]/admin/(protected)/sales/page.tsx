import { SalesManager } from "@/components/admin/SalesManager";
import { listSales } from "@/actions/sales";

export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  return <SalesManager sales={await listSales()} />;
}

import { SeoDashboard } from "@/components/admin/SeoDashboard";
import { getSeoHealth, listDescriptionDrafts } from "@/actions/seo";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const [health, drafts] = await Promise.all([getSeoHealth(), listDescriptionDrafts()]);
  return <SeoDashboard health={health} drafts={drafts.drafts} draftsReady={drafts.ready} />;
}

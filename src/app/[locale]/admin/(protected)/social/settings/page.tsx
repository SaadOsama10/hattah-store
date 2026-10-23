import { SocialSettingsForm } from "@/components/admin/SocialSettingsForm";
import { getSocialSettings, listProductOptions } from "@/actions/social";

export const dynamic = "force-dynamic";

export default async function AdminSocialSettingsPage() {
  const [settings, products] = await Promise.all([getSocialSettings(), listProductOptions()]);
  return <SocialSettingsForm initial={settings} products={products} />;
}

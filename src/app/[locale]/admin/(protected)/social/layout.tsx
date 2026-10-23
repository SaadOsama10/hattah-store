import { SocialKillSwitch } from "@/components/admin/SocialKillSwitch";
import { getSocialSettings } from "@/actions/social";

export const dynamic = "force-dynamic";

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSocialSettings();
  return (
    <div className="space-y-8">
      <SocialKillSwitch
        enabled={settings.enabled}
        autoApprove={settings.auto_approve}
        autoDisabledAt={settings.auto_disabled_at}
        lastError={settings.last_error}
        failures={settings.consecutive_failures}
      />
      {children}
    </div>
  );
}

import { KufiyaDivider } from "@/components/ui/KufiyaDivider";

/** Kept for existing call sites — now renders the kufiya divider. */
export function Divider({ className }: { className?: string }) {
  return <KufiyaDivider size="sm" className={className} />;
}

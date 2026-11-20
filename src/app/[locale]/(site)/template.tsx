import { PageFade } from "@/components/ui/PageFade";

/** Re-mounts on every navigation inside the storefront → soft fade-in. */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <PageFade>{children}</PageFade>;
}

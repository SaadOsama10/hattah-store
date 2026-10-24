import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getSeoHealth } from "@/actions/seo";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ProtectedAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(await isAdminAuthenticated())) {
    redirect({ href: "/admin/login", locale });
  }

  const health = await getSeoHealth().catch(() => null);
  const seoBroken = health && !health.ok;

  return (
    <div className="min-h-screen bg-bg-primary">
      <AdminHeader />
      {seoBroken && (
        <div dir="rtl" className="border-b-2 border-terracotta-deep bg-terracotta-deep/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3 font-inter text-sm text-cream sm:px-8">
            <span className="font-bold text-terracotta-deep">⚠ فحص SEO الأسبوعي وجد {health.problems.length} مشكلة:</span>
            <span className="text-cream-secondary">{health.problems[0]?.message}</span>
            <Link href="/admin/seo" className="ms-auto text-terracotta underline">التفاصيل</Link>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}

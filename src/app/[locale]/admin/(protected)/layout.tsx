import { redirect } from "@/i18n/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminHeader } from "@/components/admin/AdminHeader";

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

  return (
    <div className="min-h-screen bg-bg-primary">
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}

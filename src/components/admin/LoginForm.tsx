"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { loginAdmin } from "@/actions/auth";
import { Logo } from "@/components/ui/Logo";
import { Divider } from "@/components/ui/Divider";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const t = useTranslations("admin.login");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    startTransition(async () => {
      const result = await loginAdmin(password);
      if (result.success) {
        router.replace("/admin");
        router.refresh();
      } else {
        setError(true);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" linkToHome={false} />
          <h1 className="mt-6 font-playfair text-3xl font-bold text-cream">{t("title")}</h1>
          <p className="mt-2 font-inter text-sm text-cream-secondary/70">
            {t("subtitle")}
          </p>
          <Divider className="mt-6 w-full" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-cream-secondary/40"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password")}
              className="w-full rounded-2xl border border-cream/20 bg-bg-secondary py-3 ps-11 pe-4 font-inter text-sm text-cream placeholder:text-cream-secondary/40 focus:border-terracotta focus:outline-none"
            />
          </div>

          {error && (
            <p className="font-inter text-sm text-terracotta-deep">{t("error")}</p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {t("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}

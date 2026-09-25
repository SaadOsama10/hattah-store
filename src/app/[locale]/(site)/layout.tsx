import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { hasActiveOffers } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const offersActive = await hasActiveOffers();

  return (
    <CartProvider>
      <AmbientBackground />
      <Header hasOffers={offersActive} />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}

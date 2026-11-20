import { ProductCardSkeleton } from "@/components/ui/ProductCard";

/** Shown while the shop (or a category page) loads. */
export default function ShopLoading() {
  return (
    <div aria-busy="true">
      <div className="mx-auto max-w-7xl px-gutter pb-4 pt-8 sm:pt-10">
        <div className="skeleton h-9 w-40 rounded-full" />
        <div className="skeleton mt-3 h-4 w-72 max-w-full rounded-full" />
      </div>
      <div className="border-y border-line">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-hidden px-gutter py-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-3.5 gap-y-8 px-gutter pt-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

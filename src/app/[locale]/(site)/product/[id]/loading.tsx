/** Product page skeleton: gallery + buy box shapes with the warm shimmer. */
export default function ProductLoading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-7xl px-gutter pt-8">
      <div className="skeleton h-4 w-56 rounded-full" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-14">
        <div className="skeleton aspect-[4/5] rounded-panel" />
        <div className="space-y-4">
          <div className="skeleton h-3 w-28 rounded-full" />
          <div className="skeleton h-10 w-4/5 rounded-xl" />
          <div className="skeleton h-8 w-32 rounded-xl" />
          <div className="flex gap-2 pt-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-11 w-16 rounded-xl" />
            ))}
          </div>
          <div className="skeleton mt-6 h-13 w-full rounded-full" />
          <div className="skeleton h-13 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

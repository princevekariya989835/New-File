import { Skeleton } from "@/components/ui/skeleton";

export function AdminDashboardSkeleton() {
  return (
    <div
      className="space-y-6 max-w-[1600px] mx-auto pb-8 animate-pulse"
      aria-label="Loading dashboard panels"
    >
      {/* 1. Welcome Banner Skeleton */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <div className="space-y-1 text-right">
            <Skeleton className="h-3 w-24 rounded ml-auto" />
            <Skeleton className="h-3 w-20 rounded ml-auto" />
            <Skeleton className="h-1 w-10 rounded ml-auto" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-3 w-32 rounded ml-auto" />
            <Skeleton className="h-8 w-28 rounded-lg ml-auto" />
            <Skeleton className="h-3 w-36 rounded ml-auto" />
          </div>
        </div>
      </div>

      {/* 2. 4 KPI Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/80 bg-white p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32 rounded-md" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Sales Overview & Promotions Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl border border-zinc-200/80 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-44 rounded" />
              </div>
            </div>
            <Skeleton className="h-7 w-28 rounded-lg" />
          </div>
          <div className="h-64 w-full flex items-end gap-2 pt-6 px-2">
            {[30, 45, 25, 60, 35, 75, 50, 65, 40, 85, 55, 70, 50, 80].map((h, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <Skeleton className="w-full rounded-t-sm" style={{ height: `${h}%` }} />
                <Skeleton className="h-2 w-6 rounded" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <Skeleton className="h-10 w-10 rounded-xl bg-zinc-800" />
            <Skeleton className="h-3 w-20 rounded bg-zinc-800" />
            <Skeleton className="h-6 w-44 rounded bg-zinc-800" />
            <Skeleton className="h-4 w-56 rounded bg-zinc-800" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl bg-zinc-800 mt-6" />
        </section>
      </div>

      {/* 4. Recent Orders & Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 rounded-2xl border border-zinc-200/80 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </div>
            </div>
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-zinc-50"
              >
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-2 rounded-2xl border border-zinc-200/80 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </div>
            </div>
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-zinc-50"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
                <Skeleton className="h-4 w-8 rounded" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function AdminLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md md:hidden" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded font-bold" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48 rounded-md hidden sm:block" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Skeleton */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card/40 p-3 space-y-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
          ))}
        </aside>

        {/* Main Content Area Skeleton */}
        <main className="flex-1 p-4 md:p-8">
          <AdminDashboardSkeleton />
        </main>
      </div>
    </div>
  );
}

export function AdminTablePageSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading admin table data">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          {title ? (
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          ) : (
            <Skeleton className="h-8 w-36 rounded-lg" />
          )}
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-72 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-64 rounded" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminGridPageSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading admin grid data">
      <div className="space-y-2">
        {title ? (
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        ) : (
          <Skeleton className="h-8 w-40 rounded-lg" />
        )}
        <Skeleton className="h-4 w-72 rounded" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="overflow-hidden rounded-xl border bg-card space-y-3">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3.5 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

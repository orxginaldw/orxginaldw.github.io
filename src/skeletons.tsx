function Bone({ className }: { className: string }) {
  return <div className={"bone " + className} />;
}

function TableBones({ columns, rows }: { columns: string[]; rows: number }) {
  return (
    <>
      <div className="flex gap-8 border-b border-border py-2">
        {columns.map((width, index) => (
          <Bone key={index} className={"h-3 " + width} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-8 border-b border-border py-3 last:border-0">
          {columns.map((width, columnIndex) => (
            <Bone key={columnIndex} className={"h-3.5 " + width} />
          ))}
        </div>
      ))}
    </>
  );
}

export function HomeSkeleton() {
  return (
    <div className="page-fade px-8 pb-12 pt-5 max-sm:px-4">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] items-stretch gap-4 max-lg:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="card">
            <div className="card-h">
              <Bone className="h-4 w-16" />
            </div>
            <div className="grid grid-cols-[200px_minmax(0,1fr)] max-md:grid-cols-1">
              <div className="flex flex-col border-r border-border py-2 pb-4 max-md:border-b max-md:border-r-0">
                <div className="w-full px-4 py-2.5">
                  <Bone className="h-4 w-28" />
                </div>
                <div className="w-full px-4 py-2.5">
                  <Bone className="h-4 w-32" />
                </div>
              </div>
              <div className="flex min-h-0 flex-col overflow-hidden px-4 py-3 pb-4">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <Bone className="h-[21px] w-24 rounded-full" />
                  <span className="flex-1" />
                  <Bone className="h-9 w-32" />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden px-2.5">
                  <div className="flex gap-8 border-b border-border py-2">
                    <Bone className="h-3 w-24" />
                    <Bone className="h-3 w-16" />
                    <Bone className="h-3 w-10" />
                    <Bone className="h-3 w-20" />
                  </div>
                </div>
                <div className="px-2.5 py-2.5">
                  <Bone className="h-3 w-28" />
                </div>
              </div>
            </div>
          </div>
          <div className="card flex min-h-0 flex-1 flex-col">
            <div className="card-h">
              <Bone className="h-4 w-20" />
              <Bone className="h-[21px] w-24 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-4 px-[18px] pb-1 pt-1">
              {[1, 2, 3].map((index) => (
                <div key={index} className="flex items-center gap-2">
                  <Bone className="h-4 w-4 rounded-[4px]" />
                  <div className="flex flex-col gap-1.5">
                    <Bone className="h-3 w-20" />
                    <Bone className="h-5 w-14" />
                  </div>
                </div>
              ))}
            </div>
            <div className="relative min-h-[160px] flex-1 basis-0 px-[18px] pt-3">
              <Bone className="h-full w-full" />
            </div>
            <div className="flex justify-between px-[18px] pb-4 pt-2">
              {[1, 2, 3, 4, 5, 6, 7].map((index) => (
                <Bone key={index} className="h-3 w-4" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="card">
            <div className="card-h">
              <Bone className="h-4 w-16" />
            </div>
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="flex items-start gap-3 px-[18px] py-3">
                <Bone className="h-[26px] w-[26px] shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <Bone className="mb-1.5 h-3 w-16" />
                  <Bone className="h-4 w-full max-w-[160px]" />
                </div>
                <Bone className="h-3 w-12 shrink-0" />
              </div>
            ))}
            <div className="flex items-center gap-4 px-[18px] pb-4 pt-2">
              <Bone className="h-9 w-20" />
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <Bone className="h-4 w-16" />
            </div>
            {[1, 2, 3, 4, 5].map((index) => (
              <div key={index}>
                {index === 1 || index === 4 ? (
                  <div className="px-[18px] pb-2 pt-1">
                    <Bone className="h-3 w-28" />
                  </div>
                ) : null}
                <div className="flex items-center gap-3 px-[18px] py-3">
                  <Bone className="h-5 w-5 shrink-0 rounded-[5px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Bone className="h-3.5 w-28" />
                    <Bone className="h-3 w-full max-w-[180px]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-full grid grid-cols-[minmax(0,1.15fr)_minmax(280px,1fr)] items-stretch gap-4 max-lg:grid-cols-1">
          <div className="card flex h-full flex-col">
            <div className="card-h">
              <Bone className="h-4 w-12" />
            </div>
            <div className="px-[18px] pb-2 pt-1">
              <Bone className="h-3 w-24" />
            </div>
            <div className="px-2">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="flex gap-4 px-2.5 py-1.5">
                  <Bone className="h-3.5 w-[92px] shrink-0" />
                  <Bone className="h-3.5 min-w-0 flex-1 max-w-[220px]" />
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-4 px-[18px] pb-4 pt-2">
              <Bone className="h-9 w-28" />
            </div>
          </div>
          <div className="card flex h-full flex-col">
            <div className="card-h">
              <Bone className="h-4 w-14" />
            </div>
            <div className="px-[18px] pb-2 pt-1">
              <Bone className="h-3 w-28" />
            </div>
            <div className="my-auto grid grid-cols-3 gap-2 px-[18px]">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <Bone key={index} className="h-[72px] rounded-md" />
              ))}
            </div>
            <div className="mt-auto flex items-center gap-4 px-[18px] pb-4 pt-2">
              <Bone className="h-9 w-24" />
            </div>
          </div>
        </div>
        <div className="col-span-full grid grid-cols-2 items-stretch gap-4 max-md:grid-cols-1">
          <div className="card flex flex-col">
            <div className="card-h">
              <Bone className="h-4 w-28" />
            </div>
            <div className="px-[18px] pb-3.5">
              <Bone className="h-3 w-48" />
            </div>
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="flex items-start gap-3 px-[18px] py-3">
                <Bone className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Bone className="h-3 w-14" />
                  <Bone className="h-4 w-full max-w-[240px]" />
                </div>
              </div>
            ))}
            <div className="mt-auto flex items-center gap-4 px-[18px] pb-4 pt-2">
              <Bone className="h-9 w-16" />
              <Bone className="h-9 w-16" />
            </div>
          </div>
          <div className="card flex flex-col">
            <div className="card-h">
              <Bone className="h-4 w-14" />
            </div>
            <div className="px-[18px] pb-3.5">
              <Bone className="h-3 w-24" />
            </div>
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="flex items-start gap-3 px-[18px] py-3">
                <Bone className="h-5 w-5 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Bone className="h-3 w-28" />
                  <Bone className="h-4 w-full max-w-[220px]" />
                </div>
              </div>
            ))}
            <div className="mt-auto flex items-center gap-4 px-[18px] pb-4 pt-2">
              <Bone className="h-9 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InstancesSkeleton() {
  return (
    <main className="page-fade px-8 pb-12 pt-5 max-sm:px-4">
      <Bone className="h-7 w-32" />
      <Bone className="mt-1 h-4 w-full max-w-[560px]" />
      <div className="my-4 flex flex-wrap items-center gap-2">
        <Bone className="h-9 min-w-[200px] flex-1" />
        <Bone className="h-9 w-20" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Bone className="h-9 w-36" />
        <Bone className="h-9 w-24" />
        <span className="flex-1" />
        <Bone className="h-9 w-9" />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card px-2">
        <TableBones columns={["w-4", "w-20", "w-14", "w-10", "w-16", "w-14", "w-10", "w-20", "w-8"]} rows={2} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Bone className="h-3 w-48" />
        <span className="flex-1" />
        <Bone className="h-3 w-24" />
        <Bone className="h-7 w-14" />
      </div>
    </main>
  );
}

export function CreateSkeleton() {
  return (
    <>
      <main className="page-fade mx-auto w-[min(980px,calc(100%-64px))] px-8 py-7 pb-24">
        <Bone className="mb-5 h-7 w-44" />
        <section className="panel mb-4 p-5">
          <div className="mb-2 flex items-center gap-3">
            <Bone className="h-7 w-7 rounded-full" />
            <Bone className="h-5 w-40" />
          </div>
          <Bone className="mb-4 h-4 w-full max-w-[720px]" />
          <Bone className="mb-1.5 h-4 w-12" />
          <Bone className="mb-4 h-9 w-full" />
          <Bone className="mb-1.5 h-4 w-24" />
          <Bone className="mb-4 h-9 w-full" />
          <div className="mb-2 flex items-center justify-between">
            <Bone className="h-4 w-14" />
            <Bone className="h-8 w-28" />
          </div>
          <Bone className="mb-3 h-4 w-3/4" />
          <Bone className="mb-3 h-[66px] w-full" />
          <Bone className="h-[66px] w-full" />
        </section>
        {[1, 2].map((index) => (
          <div key={index} className="mb-2 flex items-center gap-3 rounded-md border border-border px-3 py-2 opacity-60">
            <Bone className="h-7 w-7 rounded-full" />
            <Bone className="h-4 w-28" />
          </div>
        ))}
      </main>
      <div className="fixed bottom-10 left-0 right-0 z-20 border-t border-border bg-header px-6 py-3">
        <div className="mx-auto flex w-[min(980px,calc(100%-64px))] flex-wrap items-center justify-between gap-4">
          <div className="min-w-[200px] flex-1">
            <Bone className="mb-1 h-3 w-36" />
            <Bone className="h-1.5 w-full rounded-full" />
          </div>
          <Bone className="h-9 w-20" />
        </div>
      </div>
    </>
  );
}

export function DownloadsSkeleton() {
  return (
    <main className="page-fade mx-auto w-[min(1400px,calc(100%-64px))] py-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <Bone className="h-3.5 w-52" />
        <Bone className="h-9 w-full max-w-[320px]" />
      </div>
      <div className="panel overflow-hidden">
        {[1, 2, 3, 4, 5].map((index) => (
          <article
            key={index}
            className="grid min-h-[200px] grid-cols-[180px_minmax(0,1fr)] gap-5 border-b border-border px-5 py-5 last:border-0 max-sm:min-h-0 max-sm:grid-cols-[112px_minmax(0,1fr)] max-sm:gap-3 max-sm:px-3 max-sm:py-3"
          >
            <div className="relative h-[180px] w-[180px] max-sm:h-28 max-sm:w-28">
              <Bone className="h-full w-full rounded-md" />
              <Bone className="absolute bottom-2 left-2 h-8 w-14 rounded" />
            </div>
            <div className="flex min-w-0 flex-col gap-2.5">
              <Bone className="h-6 w-80 max-sm:w-48" />
              <div className="flex flex-wrap items-center gap-1.5">
                <Bone className="h-[22px] w-24" />
                <Bone className="h-3 w-28" />
              </div>
              <Bone className="h-3.5 w-full" />
              <Bone className="h-3.5 w-4/5" />
              <div className="mt-auto pt-4">
                <Bone className="h-8 w-24" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export function DocsSkeleton() {
  return (
    <div className="docs-page page-fade">
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <nav>
            {[1, 2].map((group) => (
              <div key={group} className="docs-nav-group">
                <div className="docs-parent">
                  <Bone className="h-3.5 w-3.5" />
                  <Bone className="h-3.5 w-28" />
                </div>
                <div className="docs-subtabs">
                  {[1, 2, 3].map((index) => (
                    <Bone key={index} className="my-1 h-7 w-36" />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <main className="docs-content">
          <div className="docs-content-inner">
            <Bone className="mb-6 h-8 w-56" />
            <Bone className="mb-3 h-3.5 w-full" />
            <Bone className="mb-3 h-3.5 w-5/6" />
            <Bone className="mb-8 h-3.5 w-2/3" />
            <Bone className="mb-4 h-7 w-44" />
            <Bone className="mb-3 h-24 w-full" />
            <Bone className="h-32 w-full" />
          </div>
        </main>
      </div>
    </div>
  );
}

export function BillingSkeleton() {
  return (
    <main className="page-center">
      <section className="panel mb-3.5 p-4 pb-5">
        <Bone className="mb-3.5 h-4 w-16" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Bone className="h-8 w-20" />
            <Bone className="mt-2 h-3 w-28" />
          </div>
          <Bone className="h-9 w-28" />
        </div>
      </section>
      <section className="panel p-4 pb-5">
        <Bone className="mb-3.5 h-4 w-14" />
        <TableBones columns={["w-20", "w-40", "w-16", "w-12"]} rows={4} />
      </section>
    </main>
  );
}

export function NotificationsSkeleton() {
  return (
    <main className="page-center">
      <div className="mb-4 grid grid-cols-2 gap-2 max-sm:grid-cols-1">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="panel p-3">
            <Bone className="h-4 w-28" />
            <Bone className="mt-1.5 h-3 w-24" />
            <Bone className="mt-2 h-7 w-6" />
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <Bone className="h-4 w-32" />
          <Bone className="h-9 w-32" />
        </div>
        {[1, 2].map((index) => (
          <div key={index} className="grid grid-cols-[auto_1fr_auto] gap-3 border-b border-border px-4 py-3 last:border-0">
            <Bone className="mt-2 h-2 w-2 rounded-full" />
            <div className="flex flex-col gap-2">
              <Bone className="h-4 w-36" />
              <Bone className="h-3 w-64" />
            </div>
            <Bone className="h-3 w-20" />
          </div>
        ))}
      </section>
    </main>
  );
}

export function SettingsSkeleton() {
  return (
    <main className="page-center">
      <section className="panel mb-3.5 p-4 pb-5">
        <Bone className="mb-3.5 h-4 w-16" />
        {[1, 2, 3].map((index) => (
          <div key={index} className={"grid grid-cols-[120px_minmax(0,1fr)_88px] items-center gap-3 py-3 max-sm:grid-cols-1" + (index < 3 ? " border-b border-border" : "")}>
            <Bone className="h-3 w-24" />
            <Bone className="h-4 w-40" />
            <Bone className="h-9 w-16 justify-self-end" />
          </div>
        ))}
      </section>
      <section className="panel mb-3.5 p-4 pb-5">
        <Bone className="mb-3.5 h-4 w-16" />
        <Bone className="mb-1.5 h-3 w-24" />
        <Bone className="mb-3.5 h-9 w-full" />
        <div className="flex flex-wrap gap-2">
          <Bone className="h-9 w-16" />
          <Bone className="h-9 w-14" />
          <Bone className="h-9 w-24" />
        </div>
      </section>
      <section className="panel p-4 pb-5">
        <Bone className="mb-3.5 h-4 w-24" />
        <Bone className="mb-1.5 h-3 w-28" />
        <Bone className="h-9 w-full" />
      </section>
    </main>
  );
}

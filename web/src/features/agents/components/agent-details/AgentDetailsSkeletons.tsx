import { TableCell, TableRow } from "@/components/ui/table";

export function AgentHeroSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center pb-6 animate-pulse">
      <div className="h-24 w-24 rounded-2xl bg-white/20" />
      <div className="flex-1 space-y-4">
        <div className="flex gap-3">
          <div className="h-8 w-48 rounded-lg bg-white/20" />
          <div className="h-6 w-20 rounded-full bg-white/15" />
          <div className="h-6 w-16 rounded-full bg-white/15" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-32 rounded-full bg-white/15" />
          <div className="h-8 w-40 rounded-full bg-white/15" />
          <div className="h-8 w-28 rounded-full bg-white/15" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-lg bg-white/20" />
          <div className="h-8 w-24 rounded-lg bg-white/20" />
        </div>
      </div>
    </div>
  );
}

export function CandidatesTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="animate-pulse">
          <TableCell className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="h-3 w-40 rounded bg-slate-100" />
              </div>
            </div>
          </TableCell>
          <TableCell className="px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-slate-200" />
              <div className="h-7 w-7 rounded-lg bg-slate-200" />
              <div className="h-3 w-24 rounded bg-slate-100" />
            </div>
          </TableCell>
          <TableCell className="px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-slate-200" />
              <div className="h-3 w-20 rounded bg-slate-100" />
            </div>
          </TableCell>
          <TableCell className="px-5 py-4">
            <div className="flex flex-wrap gap-1">
              <div className="h-5 w-16 rounded-full bg-slate-100" />
              <div className="h-5 w-20 rounded-full bg-slate-100" />
            </div>
          </TableCell>
          <TableCell className="px-5 py-4">
            <div className="h-3 w-20 rounded bg-slate-100" />
          </TableCell>
          <TableCell className="px-5 py-4">
            <div className="h-8 w-16 rounded-lg bg-slate-100 ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

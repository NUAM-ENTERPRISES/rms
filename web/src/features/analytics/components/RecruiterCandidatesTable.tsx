import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useGetRecruiterCandidatesQuery } from "@/services/recruiterAnalyticsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { ImageViewer } from "@/components/molecules";

interface RecruiterCandidatesTableProps {
  selectedRecruiter: { id: string; name: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  Interested: "bg-blue-50 text-blue-700",
  Qualified: "bg-emerald-50 text-emerald-700",
  RNR: "bg-red-50 text-red-700",
  Untouched: "bg-gray-100 text-gray-600",
  Deployed: "bg-teal-50 text-teal-700",
  "Not Interested": "bg-orange-50 text-orange-700",
  "On Hold": "bg-yellow-50 text-yellow-700",
  Future: "bg-sky-50 text-sky-700",
};

const PAGE_SIZE = 10;

export default function RecruiterCandidatesTable({
  selectedRecruiter,
}: RecruiterCandidatesTableProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data: res, isLoading, isFetching } = useGetRecruiterCandidatesQuery(
    {
      recruiterId: selectedRecruiter?.id ?? "",
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { skip: !selectedRecruiter },
  );

  const candidates = res?.data?.candidates ?? [];
  const total = res?.data?.total ?? 0;
  const totalPages = res?.data?.totalPages ?? 1;
  const currentPage = Math.min(page, totalPages || 1);
  const start = (currentPage - 1) * PAGE_SIZE;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Recruiter Candidates
          </h3>
          <p className="text-sm text-gray-500">
            All candidates handled by {selectedRecruiter?.name ?? "—"} ({total})
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created By</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mx-auto" />
                </td>
              </tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-gray-400">
                  No candidates found
                </td>
              </tr>
            ) : (
              candidates.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                >
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <ImageViewer
                        title={c.fullName}
                        src={c.profileImage || null}
                        fallbackSrc="https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                        className="h-8 w-8 rounded-full"
                        ariaLabel={`View full image for ${c.fullName}`}
                        enableHoverPreview={true}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {c.fullName}
                        </div>
                        {c.candidateCode ? (
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            {c.candidateCode}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{c.phone}</td>
                  <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{c.email}</td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-gray-700 font-medium">{c.projectCount}</td>
                  <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{c.source}</td>
                  <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{c.createdBy}</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => navigate(`/candidates/${c.id}`)}
                      className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
          <p className="text-xs text-gray-500">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
            {isFetching && !isLoading ? " (loading...)" : ""}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`inline-flex items-center justify-center rounded-md h-8 w-8 text-xs font-medium transition-colors cursor-pointer ${
                  n === currentPage
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

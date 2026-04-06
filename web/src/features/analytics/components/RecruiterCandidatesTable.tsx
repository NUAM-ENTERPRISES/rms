import { useState } from "react";
import { Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Recruiter } from "../data/mockRecruiterData";

interface RecruiterCandidatesTableProps {
  selectedRecruiter: Recruiter;
}

interface Candidate {
  id: number;
  fullName: string;
  avatar: string;
  phone: string;
  email: string;
  status: string;
  projectCount: number;
  source: string;
  createdBy: string;
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

const mockCandidatesByRecruiter: Record<string, Candidate[]> = {
  "rec-1": [
    { id: 1, fullName: "Rahul Kumar", avatar: "https://ui-avatars.com/api/?name=Rahul+Kumar&background=6366f1&color=fff&size=32", phone: "+91 9876543210", email: "rahul.kumar@example.com", status: "Interested", projectCount: 2, source: "LinkedIn", createdBy: "Aarav Sharma" },
    { id: 2, fullName: "Priya Nair", avatar: "https://ui-avatars.com/api/?name=Priya+Nair&background=ec4899&color=fff&size=32", phone: "+91 9123456789", email: "priya.nair@example.com", status: "Qualified", projectCount: 3, source: "Referral", createdBy: "Aarav Sharma" },
    { id: 3, fullName: "Arjun Das", avatar: "https://ui-avatars.com/api/?name=Arjun+Das&background=14b8a6&color=fff&size=32", phone: "+91 9988776655", email: "arjun.das@example.com", status: "RNR", projectCount: 1, source: "Naukri", createdBy: "Aarav Sharma" },
    { id: 4, fullName: "Anjali Sharma", avatar: "https://ui-avatars.com/api/?name=Anjali+Sharma&background=f59e0b&color=fff&size=32", phone: "+91 9001122334", email: "anjali.sharma@example.com", status: "Untouched", projectCount: 1, source: "Website", createdBy: "Aarav Sharma" },
    { id: 5, fullName: "Vikram Singh", avatar: "https://ui-avatars.com/api/?name=Vikram+Singh&background=3b82f6&color=fff&size=32", phone: "+91 9112233445", email: "vikram.singh@example.com", status: "Deployed", projectCount: 2, source: "LinkedIn", createdBy: "Aarav Sharma" },
    { id: 18, fullName: "Neha Kapoor", avatar: "https://ui-avatars.com/api/?name=Neha+Kapoor&background=8b5cf6&color=fff&size=32", phone: "+91 9556677001", email: "neha.kapoor@example.com", status: "Interested", projectCount: 1, source: "Referral", createdBy: "Aarav Sharma" },
    { id: 19, fullName: "Amit Tiwari", avatar: "https://ui-avatars.com/api/?name=Amit+Tiwari&background=ef4444&color=fff&size=32", phone: "+91 9667788112", email: "amit.tiwari@example.com", status: "Qualified", projectCount: 2, source: "Naukri", createdBy: "Aarav Sharma" },
  ],
  "rec-2": [
    { id: 6, fullName: "Sneha Verma", avatar: "https://ui-avatars.com/api/?name=Sneha+Verma&background=ec4899&color=fff&size=32", phone: "+91 9223344556", email: "sneha.verma@example.com", status: "Interested", projectCount: 1, source: "Referral", createdBy: "Priya Patel" },
    { id: 7, fullName: "Karan Joshi", avatar: "https://ui-avatars.com/api/?name=Karan+Joshi&background=6366f1&color=fff&size=32", phone: "+91 9334455667", email: "karan.joshi@example.com", status: "Qualified", projectCount: 2, source: "Naukri", createdBy: "Priya Patel" },
    { id: 8, fullName: "Meera Iyer", avatar: "https://ui-avatars.com/api/?name=Meera+Iyer&background=14b8a6&color=fff&size=32", phone: "+91 9445566778", email: "meera.iyer@example.com", status: "Not Interested", projectCount: 0, source: "Website", createdBy: "Priya Patel" },
    { id: 9, fullName: "Rohit Pandey", avatar: "https://ui-avatars.com/api/?name=Rohit+Pandey&background=f59e0b&color=fff&size=32", phone: "+91 9556677889", email: "rohit.pandey@example.com", status: "On Hold", projectCount: 1, source: "LinkedIn", createdBy: "Priya Patel" },
    { id: 20, fullName: "Divya Rajan", avatar: "https://ui-avatars.com/api/?name=Divya+Rajan&background=3b82f6&color=fff&size=32", phone: "+91 9778899223", email: "divya.rajan@example.com", status: "Future", projectCount: 1, source: "Referral", createdBy: "Priya Patel" },
    { id: 21, fullName: "Sanjay Mishra", avatar: "https://ui-avatars.com/api/?name=Sanjay+Mishra&background=8b5cf6&color=fff&size=32", phone: "+91 9889900334", email: "sanjay.mishra@example.com", status: "Untouched", projectCount: 0, source: "Naukri", createdBy: "Priya Patel" },
  ],
  "rec-3": [
    { id: 10, fullName: "Deepak Rao", avatar: "https://ui-avatars.com/api/?name=Deepak+Rao&background=14b8a6&color=fff&size=32", phone: "+91 9667788990", email: "deepak.rao@example.com", status: "Untouched", projectCount: 0, source: "Naukri", createdBy: "Rohan Mehta" },
    { id: 11, fullName: "Kavita Menon", avatar: "https://ui-avatars.com/api/?name=Kavita+Menon&background=ec4899&color=fff&size=32", phone: "+91 9778899001", email: "kavita.menon@example.com", status: "Future", projectCount: 1, source: "Referral", createdBy: "Rohan Mehta" },
    { id: 12, fullName: "Suresh Pillai", avatar: "https://ui-avatars.com/api/?name=Suresh+Pillai&background=6366f1&color=fff&size=32", phone: "+91 9889900112", email: "suresh.pillai@example.com", status: "Interested", projectCount: 2, source: "LinkedIn", createdBy: "Rohan Mehta" },
    { id: 22, fullName: "Lakshmi Nair", avatar: "https://ui-avatars.com/api/?name=Lakshmi+Nair&background=f59e0b&color=fff&size=32", phone: "+91 9990011334", email: "lakshmi.nair@example.com", status: "Qualified", projectCount: 1, source: "Website", createdBy: "Rohan Mehta" },
    { id: 23, fullName: "Ganesh Iyer", avatar: "https://ui-avatars.com/api/?name=Ganesh+Iyer&background=3b82f6&color=fff&size=32", phone: "+91 9001122445", email: "ganesh.iyer@example.com", status: "RNR", projectCount: 1, source: "Naukri", createdBy: "Rohan Mehta" },
  ],
  "rec-4": [
    { id: 13, fullName: "Anita Deshmukh", avatar: "https://ui-avatars.com/api/?name=Anita+Deshmukh&background=ec4899&color=fff&size=32", phone: "+91 9990011223", email: "anita.deshmukh@example.com", status: "Qualified", projectCount: 3, source: "Referral", createdBy: "Sneha Reddy" },
    { id: 14, fullName: "Manoj Kulkarni", avatar: "https://ui-avatars.com/api/?name=Manoj+Kulkarni&background=ef4444&color=fff&size=32", phone: "+91 9001122335", email: "manoj.kulkarni@example.com", status: "RNR", projectCount: 1, source: "Naukri", createdBy: "Sneha Reddy" },
    { id: 15, fullName: "Pooja Bhatt", avatar: "https://ui-avatars.com/api/?name=Pooja+Bhatt&background=14b8a6&color=fff&size=32", phone: "+91 9112233446", email: "pooja.bhatt@example.com", status: "Deployed", projectCount: 2, source: "LinkedIn", createdBy: "Sneha Reddy" },
    { id: 16, fullName: "Ravi Shankar", avatar: "https://ui-avatars.com/api/?name=Ravi+Shankar&background=6366f1&color=fff&size=32", phone: "+91 9223344557", email: "ravi.shankar@example.com", status: "Interested", projectCount: 1, source: "Website", createdBy: "Sneha Reddy" },
    { id: 17, fullName: "Nisha Gupta", avatar: "https://ui-avatars.com/api/?name=Nisha+Gupta&background=f59e0b&color=fff&size=32", phone: "+91 9334455668", email: "nisha.gupta@example.com", status: "Untouched", projectCount: 0, source: "Naukri", createdBy: "Sneha Reddy" },
    { id: 24, fullName: "Tarun Hegde", avatar: "https://ui-avatars.com/api/?name=Tarun+Hegde&background=8b5cf6&color=fff&size=32", phone: "+91 9445566779", email: "tarun.hegde@example.com", status: "On Hold", projectCount: 1, source: "Referral", createdBy: "Sneha Reddy" },
  ],
};

const PAGE_SIZE = 5;
const defaultCandidates = mockCandidatesByRecruiter["rec-1"];

export default function RecruiterCandidatesTable({
  selectedRecruiter,
}: RecruiterCandidatesTableProps) {
  const allCandidates =
    mockCandidatesByRecruiter[selectedRecruiter.id] ?? defaultCandidates;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Reset page when recruiter or search changes
  const filtered = allCandidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.status.toLowerCase().includes(q) ||
      c.source.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const candidates = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Recruiter Candidates
          </h3>
          <p className="text-sm text-gray-500">
            All candidates handled by {selectedRecruiter.name} ({filtered.length})
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
            {candidates.length === 0 ? (
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
                      <img
                        src={c.avatar}
                        alt={c.fullName}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <span className="font-medium text-gray-900">{c.fullName}</span>
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
                      onClick={() => console.log("View candidate", c.id)}
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
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
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

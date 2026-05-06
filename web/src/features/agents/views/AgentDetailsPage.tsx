import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetAgentQuery, useGetAgentCandidatesQuery } from "../api";
import { useDebounce } from "@/hooks";
import { useCan } from "@/hooks/useCan";
import { useHasRole } from "@/hooks/useCan";
import {
  AgentDetailsNotFound,
  AgentDetailsHero,
  AgentDetailsStats,
  AgentDetailsCandidatesSection,
  AgentLinkedProjectsSection,
  AgentEditAgentDialog,
} from "../components/agent-details";

const LIMIT = 10;

export default function AgentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canEditAgent = useCan("edit:agents");
  const canCreateCandidate = useCan("write:candidates");
  const canEditDeclaredProjects = useCan("write:candidates");
  const isPrivilegedAdmin = useHasRole(["CEO", "Director", "Manager", "System Admin", "Admin"]);
  const canCreateCandidateUi = canCreateCandidate && !isPrivilegedAdmin;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const {
    data: agentResponse,
    isLoading: isAgentLoading,
    isError: isAgentError,
  } = useGetAgentQuery(id!, { skip: !id });

  const {
    data: candidatesResponse,
    isLoading: isCandidatesLoading,
    isFetching: isCandidatesFetching,
  } = useGetAgentCandidatesQuery(
    {
      id: id!,
      search: debouncedSearch || undefined,
      page,
      limit: LIMIT,
    },
    { skip: !id },
  );

  const agent = agentResponse?.data;
  const candidates = candidatesResponse?.data ?? [];
  const meta = candidatesResponse?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const totalCount = meta?.total ?? 0;
  const hasActiveSearch = Boolean(search.trim());

  if (isAgentError) {
    return <AgentDetailsNotFound onBack={() => navigate("/agents")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AgentDetailsHero
        isLoading={isAgentLoading}
        agent={agent}
        onBack={() => navigate("/agents")}
        canEditAgent={canEditAgent}
        onEditClick={() => setIsEditModalOpen(true)}
      />

      <AgentDetailsStats agent={agent} totalCount={totalCount} />

      <div className="px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left: Candidates table (takes 2 cols on lg) */}
          <div className="lg:col-span-2">
            <AgentDetailsCandidatesSection
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              onClearSearch={() => setSearch("")}
              hasActiveSearch={hasActiveSearch}
              totalCount={totalCount}
              candidates={candidates}
              isLoading={isCandidatesLoading}
              isFetching={isCandidatesFetching}
              page={page}
              totalPages={totalPages}
              pageSize={LIMIT}
              onPageChange={setPage}
              onViewCandidate={(candidateId) =>
                navigate(`/candidates/${candidateId}`)
              }
              canAddCandidate={canCreateCandidateUi}
              onAddCandidate={() =>
                navigate(`/candidates/create?agentId=${id}`)
              }
              agentId={id!}
              canEditDeclaredProjects={canEditDeclaredProjects}
            />
          </div>

          {/* Right: Linked Projects (1 col on lg) */}
          <div className="lg:col-span-1">
            {id ? <AgentLinkedProjectsSection agentId={id} /> : null}
          </div>
        </div>
      </div>

      {id ? (
        <AgentEditAgentDialog
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          agentId={id}
          agent={agent}
        />
      ) : null}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const DUMMY = [
  {
    id: "s1",
    candidate: { firstName: "Aisha", lastName: "Khan", email: "aisha.k@example.com" },
    role: { designation: "Software Engineer II" },
    project: { title: "Alpha", id: "p1" },
    sentAt: new Date().toISOString(),
    verified: true,
  },
  {
    id: "s2",
    candidate: { firstName: "Rahul", lastName: "Verma", email: "rahul.v@example.com" },
    role: { designation: "Frontend Developer" },
    project: { title: "Beta", id: "p2" },
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    verified: true,
  },
  {
    id: "s3",
    candidate: { firstName: "Maria", lastName: "Gomez", email: "maria.g@example.com" },
    role: { designation: "QA Analyst" },
    project: { title: "Gamma", id: "p3" },
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    verified: true,
  },
];

export default function ShortlistingListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);

  const displayed = DUMMY;

  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  const selected = useMemo(() => {
    if (selectedId) return displayed.find((i) => i.id === selectedId) || null;
    return displayed[0] || null;
  }, [displayed, selectedId]);

  function toggleShortlist(id: string) {
    setShortlistedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Compact Colorful Header */}
      <div className="border-b bg-white/80 backdrop-blur">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Short Listing Pending Candidates</h1>
                <p className="text-xs text-muted-foreground">Documents verified & sent to client — shortlist to progress</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Compact List Panel */}
        <div className="w-80 border-r bg-white/60 flex flex-col">
          {displayed.length > 0 && (
            <div className="p-3 border-b flex items-center justify-between bg-white/40">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-shortlisting"
                  checked={displayed.length > 0 && displayed.every((it) => selectedBulkIds.includes(it.id))}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedBulkIds(displayed.map((it) => it.id));
                    } else {
                      setSelectedBulkIds([]);
                    }
                  }}
                />
                <label htmlFor="select-all-shortlisting" className="text-xs font-medium cursor-pointer select-none">
                  {selectedBulkIds.length > 0 ? `${selectedBulkIds.length} selected` : "Select All"}
                </label>
              </div>
              {selectedBulkIds.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setSelectedBulkIds([])}>
                  Clear
                </Button>
              )}
            </div>
          )}

          <ScrollArea className="flex-1">
            {displayed.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-40 text-amber-400" />
                <p className="font-medium">No items sent to client</p>
                <p className="text-xs mt-1">Sent candidates will appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {displayed.map((it) => {
                  const candidate = it.candidate;
                  const role = it.role;
                  const project = it.project;
                  const isSelected = it.id === selected?.id;

                  return (
                    <div key={it.id} className="relative flex items-center gap-1 group">
                      <Checkbox
                        checked={selectedBulkIds.includes(it.id)}
                        onCheckedChange={(checked) => {
                          setSelectedBulkIds((prev) => (checked ? [...prev, it.id] : prev.filter((id) => id !== it.id)));
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                      />
                      <button
                        onClick={() => setSelectedId(it.id)}
                        className={cn(
                          "flex-1 text-left p-3 rounded-lg border transition-all",
                          isSelected
                            ? "bg-gradient-to-r from-amber-50 to-amber-50 border-amber-300"
                            : "bg-white border-transparent hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                              {candidate ? `${candidate.firstName?.[0] || ""}${candidate.lastName?.[0] || ""}`.toUpperCase() : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}</p>
                            <p className="text-xs text-amber-600 truncate mt-1">{role?.designation || "Unknown Role"}</p>
                            <p className="text-xs text-muted-foreground truncate">{project?.title || "Unknown Project"}</p>
                          </div>
                          <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isSelected && "text-amber-600")} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={cn("text-xs px-2 py-0.5 font-medium", "bg-emerald-100 text-emerald-800")}>
                            Sent to Client
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(it.sentAt), "MMM d, yyyy")}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Compact Detail Panel */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-5 max-w-4xl mx-auto space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-slate-900">Interview Details</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selected.sentAt ? format(new Date(selected.sentAt), "MMMM d, yyyy • h:mm a") : "Sent to client"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={cn("px-3 py-1 text-sm font-medium shadow-sm", "bg-emerald-100 text-emerald-800")}>Sent</Badge>

                    {shortlistedIds.includes(selected.id) ? (
                      <Button size="sm" className="bg-indigo-600 text-white">Shortlisted</Button>
                    ) : (
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => toggleShortlist(selected.id)}>
                        Shortlist
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50/70 to-amber-50/70">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                            {selected.candidate ? `${selected.candidate.firstName?.[0] || ""}${selected.candidate.lastName?.[0] || ""}`.toUpperCase() : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-amber-700 text-sm">Candidate</h3>
                          <p className="font-medium text-sm mt-1">{selected.candidate ? `${selected.candidate.firstName} ${selected.candidate.lastName}` : "Unknown"}</p>
                          {selected.candidate?.email && (
                            <p className="text-xs text-muted-foreground mt-1 break-all">{selected.candidate.email}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50/70 to-amber-50/70">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-yellow-700 text-sm mb-3">Project & Role</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Project</p>
                          <p className="font-medium text-yellow-800">{selected.project?.title || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Role</p>
                          <p className="font-medium">{selected.role?.designation || "Unknown"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50/70 to-teal-50/70">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-emerald-700 text-sm mb-3">Assignment Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <p className="font-medium capitalize text-emerald-800">Sent to client</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sent Time</p>
                        <p className="font-medium text-emerald-800">{selected.sentAt ? format(new Date(selected.sentAt), "MMM d, yyyy • h:mm a") : "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-30 text-amber-400" />
                <p className="font-medium">No item selected</p>
                <p className="text-sm">Select from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

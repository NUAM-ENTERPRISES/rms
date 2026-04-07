import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface RecruiterOption {
  id: string;
  name: string;
  email: string;
}

interface RecruiterSelectorProps {
  recruiters: RecruiterOption[];
  selected: RecruiterOption | null;
  onSelect: (recruiter: RecruiterOption) => void;
  isLoading?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function RecruiterSelector({
  recruiters,
  selected,
  onSelect,
  isLoading,
}: RecruiterSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-72">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading}
        className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm border border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer"
      >
        {selected ? (
          <>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                {getInitials(selected.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-500">{selected.email}</p>
            </div>
          </>
        ) : (
          <div className="flex-1 text-left">
            <p className="text-sm text-gray-500">
              {isLoading ? "Loading recruiters..." : "Select a recruiter"}
            </p>
          </div>
        )}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl bg-white shadow-lg border border-gray-100 py-1 max-h-64 overflow-y-auto">
          {recruiters.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${
                r.id === selected?.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                  {getInitials(r.name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-gray-500">{r.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

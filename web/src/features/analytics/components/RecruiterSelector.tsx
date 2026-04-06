import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Recruiter } from "../data/mockRecruiterData";

interface RecruiterSelectorProps {
  recruiters: Recruiter[];
  selected: Recruiter;
  onSelect: (recruiter: Recruiter) => void;
}

export default function RecruiterSelector({
  recruiters,
  selected,
  onSelect,
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
        className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm border border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer"
      >
        <img
          src={selected.avatar}
          alt={selected.name}
          className="h-9 w-9 rounded-full object-cover"
        />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
          <p className="text-xs text-gray-500">{selected.role}</p>
        </div>
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
                r.id === selected.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <img
                src={r.avatar}
                alt={r.name}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="text-left">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-gray-500">{r.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { CircleCheck, CircleX } from "lucide-react";
import { Link } from "react-router-dom";
import type { ImportRowResult } from "../data/dto";

interface ImportResultsTableProps {
  results: ImportRowResult[];
}

export function ImportResultsTable({ results }: ImportResultsTableProps) {
  if (results.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Import results by row</caption>
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Sheet
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Row
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Result
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.rowId} className="border-t border-border">
              <td className="px-3 py-2">{result.sheetName}</td>
              <td className="px-3 py-2 tabular-nums">{result.rowNumber}</td>
              <td className="px-3 py-2">
                {result.success ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CircleCheck className="h-4 w-4" aria-hidden="true" />
                    {result.candidateId ? (
                      <Link
                        to={`/candidates/${result.candidateId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        Created
                      </Link>
                    ) : (
                      "Created"
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-destructive">
                    <CircleX className="h-4 w-4" aria-hidden="true" />
                    {result.error ?? "Failed"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

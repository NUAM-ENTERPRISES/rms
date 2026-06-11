import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Download, Save } from "lucide-react";
import {
  buildCsvFile,
  CsvGridState,
  downloadCsvFile,
} from "../utils/buildBulkSendCsv";

interface CsvEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGrid: CsvGridState | null;
  onSave: (grid: CsvGridState, file: File) => void;
}

export function CsvEditorModal({
  isOpen,
  onClose,
  initialGrid,
  onSave,
}: CsvEditorModalProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState("bulk-send.csv");

  useEffect(() => {
    if (!isOpen || !initialGrid) return;
    setHeaders(initialGrid.headers);
    setRows(initialGrid.rows.map((row) => [...row]));
    setFileName(initialGrid.fileName);
  }, [isOpen, initialGrid]);

  const serialNoColumnIndex = useMemo(
    () => headers.findIndex((header) => header === "Serial No"),
    [headers],
  );

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    setRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? row.map((cell, cellIndex) =>
              cellIndex === columnIndex ? value : cell,
            )
          : row,
      ),
    );
  };

  const handleSave = () => {
    const normalizedRows = rows.map((row, index) =>
      row.map((cell, columnIndex) =>
        columnIndex === serialNoColumnIndex ? String(index + 1) : cell,
      ),
    );
    const grid: CsvGridState = {
      headers,
      rows: normalizedRows,
      fileName,
    };
    const file = buildCsvFile(fileName, headers, normalizedRows);
    onSave(grid, file);
    onClose();
  };

  const handleDownload = () => {
    const file = buildCsvFile(fileName, headers, rows);
    downloadCsvFile(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[95vw] w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>Review CSV Attachment</DialogTitle>
          <DialogDescription>
            Review and edit values before attaching. Changes are not saved to
            candidate profiles.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="min-w-max border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 border-b whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={`row-${rowIndex}`}
                    className="border-b last:border-b-0 odd:bg-white even:bg-slate-50/70 dark:odd:bg-gray-950 dark:even:bg-gray-900/40"
                  >
                    {row.map((cell, columnIndex) => {
                      const isSerialNo = columnIndex === serialNoColumnIndex;
                      return (
                        <td key={`${rowIndex}-${columnIndex}`} className="p-1 align-top">
                          {isSerialNo ? (
                            <div className="px-2 py-1.5 min-w-[48px] text-slate-600 font-medium">
                              {rowIndex + 1}
                            </div>
                          ) : (
                            <Input
                              value={cell}
                              onChange={(event) =>
                                updateCell(rowIndex, columnIndex, event.target.value)
                              }
                              aria-label={`${headers[columnIndex]} row ${rowIndex + 1}`}
                              className="h-8 min-w-[140px] text-xs"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button type="button" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save attachment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

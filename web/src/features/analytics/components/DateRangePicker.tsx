"use client";

import { format, subDays } from "date-fns";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DateRangePicker({ date, setDate }: any) {
  const presets = [
    { label: "Last 7 days", value: 7 },
    { label: "Last 30 days", value: 30 },
    { label: "Last 90 days", value: 90 },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="font-medium">
          <Calendar className="mr-2 h-4 w-4" />
          {format(date.from, "MMM d")} – {format(date.to, "MMM d, yyyy")}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-3" align="end">
        <div className="grid gap-2">
          {presets.map((p) => (
            <Button
              key={p.value}
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() =>
                setDate({
                  from: subDays(new Date(), p.value),
                  to: new Date(),
                })
              }
            >
              {p.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean; // render compact (smaller height) variant
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled = false,
  className,
  compact = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value && !isNaN(value.getTime()) ? value : undefined
  );
  const [timeValue, setTimeValue] = useState(() => {
    if (value && !isNaN(value.getTime())) {
      return format(value, "HH:mm");
    }
    return "09:00";
  });

  // Sync internal state with external value changes
  useEffect(() => {
    if (value && !isNaN(value.getTime())) {
      setSelectedDate(value);
      setTimeValue(format(value, "HH:mm"));
    } else {
      setSelectedDate(undefined);
      setTimeValue("09:00");
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
  };

  const handleApply = () => {
    if (selectedDate && timeValue) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes, 0, 0);
      onChange?.(newDate);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setSelectedDate(value);
    setTimeValue(value ? format(value, "HH:mm") : "09:00");
    setOpen(false);
  };

  const formatDateTime = (date: Date) => {
    try {
      return format(date, "PPP 'at' p");
    } catch (error) {
      console.error("Error formatting date:", error);
      return date.toLocaleString();
    }
  };

  const buttonHeightClasses = compact ? "h-8 sm:h-9 text-sm" : "h-10 sm:h-11 text-sm sm:text-base";
  const inputHeightClasses = compact ? "h-8 sm:h-9" : "h-10 sm:h-11";
  const cellSize = compact ? "[--cell-size:2.25rem]" : "[--cell-size:2.75rem]";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            `${buttonHeightClasses} w-full justify-start text-left font-normal border-slate-200 focus:border-blue-500 focus:ring-blue-500/20`,
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {value ? formatDateTime(value) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto min-w-[520px] max-w-[700px] p-3 sm:p-4"
        align="start"
      >
        <div className="flex gap-6">
          {/* Left side - Date Calendar */}
          <div className="flex-1 space-y-3">
            <Label className="text-sm font-medium text-slate-700">
              Select Date
            </Label>
            <div className="flex justify-center p-2 bg-slate-50 rounded-lg">
              <div className="w-full max-w-[320px]">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={`rounded-lg border border-slate-200 bg-white shadow-sm ${cellSize} w-full`}
                />
              </div>
            </div>
          </div>

          {/* Right side - Time picker and buttons */}
          <div className="flex-1 space-y-4">
            <div className="space-y-3">
              <Label
                htmlFor="time"
                className="text-sm font-medium text-slate-700"
              >
                Select Time
              </Label>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <Input
                  id="time"
                  type="time"
                  value={timeValue}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className={`w-full ${inputHeightClasses} border-slate-200 focus:border-blue-500 focus:ring-blue-500/20`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className={`${compact ? 'h-8 sm:h-9 px-3' : 'h-9 sm:h-10 px-4 sm:px-6'} border-slate-200 hover:border-slate-300 text-sm`}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!selectedDate}
                className={`${compact ? 'h-8 sm:h-9 px-3' : 'h-9 sm:h-10 px-4 sm:px-6'} bg-blue-600 hover:bg-blue-700 text-sm`}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useState } from "react";
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

interface DialogDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DialogDatePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled = false,
  className,
}: DialogDatePickerProps) {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 sm:h-11 w-full justify-start text-left font-normal border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 text-sm sm:text-base",
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
        className="w-auto min-w-[300px] max-w-[350px] p-2"
        align="start"
        side="top"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={10}
      >
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-700">
              Select Date
            </Label>
            <div className="flex justify-center p-1 bg-slate-50 rounded-lg">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                className="rounded-lg border border-slate-200 bg-white shadow-sm [--cell-size:2rem] w-full"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="time"
              className="text-xs font-medium text-slate-700"
            >
              Select Time
            </Label>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-slate-500 flex-shrink-0" />
              <Input
                id="time"
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full h-8 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-7 px-2 border-slate-200 hover:border-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!selectedDate}
              className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-xs"
            >
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

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

interface CompactDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CompactDatePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled = false,
  className,
}: CompactDatePickerProps) {
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
            "h-10 sm:h-11 w-full justify-start text-left font-normal border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
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
        className="w-auto p-4"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={10}
        style={{ maxHeight: "400px", overflow: "auto" }}
      >
        <div className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Select Date
            </Label>
            <div className="p-2 bg-slate-50 rounded-lg">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                className="[--cell-size:2.25rem] w-full"
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Select Time
            </Label>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-slate-500" />
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="h-10 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-9 px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!selectedDate}
              className="h-9 px-4 text-sm"
            >
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

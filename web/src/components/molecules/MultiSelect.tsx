/**
 * Generic Multi-Select component
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  value?: string[];
  onValueChange?: (value: string[]) => void;
  options: MultiSelectOption[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function MultiSelect({
  value = [],
  onValueChange,
  options,
  label,
  placeholder = "Select options...",
  required = false,
  disabled = false,
  error,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    const isSelected = value.includes(optionValue);
    let newValue: string[];
    
    if (isSelected) {
      newValue = value.filter((v) => v !== optionValue);
    } else {
      newValue = [...value, optionValue];
    }
    
    onValueChange?.(newValue);
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.(value.filter((v) => v !== optionValue));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "flex flex-wrap gap-2 p-2 min-h-[44px] w-full bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors",
              disabled && "opacity-50 cursor-not-allowed",
              error && "border-destructive focus-within:ring-destructive"
            )}
            onClick={() => !disabled && setOpen(!open)}
          >
            {value.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {value.map((v) => {
                  const option = options.find((o) => o.value === v);
                  return (
                    <Badge
                      key={v}
                      variant="secondary"
                      className="bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1 pr-1"
                    >
                      <span>{option?.label || v}</span>
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-indigo-900"
                        onClick={(e) => removeOption(v, e)}
                      />
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <span className="text-slate-400 text-sm py-1 px-1">{placeholder}</span>
            )}
            <div className="ml-auto flex items-center pr-1">
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[240px] p-0 shadow-xl border-slate-200 rounded-xl" align="start">
          <div className="p-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-sm border-slate-200 focus:ring-blue-500 rounded-lg"
              />
            </div>

            <div className="max-h-[200px] overflow-y-auto pr-1 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-sm text-slate-400">
                  No options found
                </div>
              ) : (
                <>
                  {filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                        value.includes(option.value)
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "hover:bg-slate-50 text-slate-600"
                      )}
                      onClick={() => handleSelect(option.value)}
                    >
                      <div className={cn(
                        "h-4 w-4 border border-slate-300 rounded flex items-center justify-center transition-colors",
                        value.includes(option.value) ? "bg-indigo-600 border-indigo-600" : "bg-white"
                      )}>
                        {value.includes(option.value) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="truncate flex-1">{option.label}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export default MultiSelect;

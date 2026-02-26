import React, { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Mail, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiEmailInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function MultiEmailInput({
  emails,
  onChange,
  placeholder = "Add email...",
  label,
  icon,
  className
}: MultiEmailInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    if (!validateEmail(trimmedEmail)) {
      setError("Invalid email format");
      return;
    }

    if (emails.includes(trimmedEmail)) {
      setError("Email already added");
      setInputValue("");
      return;
    }

    onChange([...emails, trimmedEmail]);
    setInputValue("");
    setError(null);
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(emails.filter((e) => e !== emailToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">
          {label}
        </p>
      )}
      <div 
        className={cn(
          "min-h-[40px] p-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 rounded-lg focus-within:ring-2 focus-within:ring-blue-500/20 transition-all",
          error ? "border-red-300 ring-red-100" : ""
        )}
      >
        <div className="flex flex-wrap gap-1.5 items-center">
          {icon && <div className="ml-1 text-slate-400">{icon}</div>}
          
          {emails.map((email) => (
            <Badge 
              key={email}
              variant="secondary"
              className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800 flex items-center gap-1 pr-1 pl-2 py-0.5"
            >
              <span className="text-[10px] font-medium">{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          
          <input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => addEmail(inputValue)}
            placeholder={emails.length === 0 ? placeholder : ""}
            className="flex-1 bg-transparent border-none outline-none text-xs min-w-[120px] p-1"
          />
        </div>
      </div>
      {error && (
        <p className="text-[10px] text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

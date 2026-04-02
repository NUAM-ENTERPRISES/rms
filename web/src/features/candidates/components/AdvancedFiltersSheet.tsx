import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetOverlay,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  SlidersHorizontal, 
  Globe, 
  Building2, 
  Share2, 
  CalendarDays
} from "lucide-react";
import { MultiCountrySelect, MultiSelect, DatePicker, QualificationSelect, DepartmentSelect, JobTitleSelect } from "@/components/molecules";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SECTOR_TYPES, VISA_TYPES, SKIN_TONES, SMARTNESS_LEVELS } from "@/constants/candidate-constants";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface CandidateFilters {
  search: string;
  page: number;
  limit: number;
  recruiterId?: string;
  dateFilter: string;
  dateFrom?: Date;
  dateTo?: Date;
  countryPreferences: string[];
  sectorTypes: string[];
  facilityPreferences: string[];
  gender: string;
  sources: string[];
  status: string;
  mainStatus?: string;
  subStatus?: string;
  processingStep?: string;
  minExperience?: number;
  maxExperience?: number;
  minSalary?: number;
  maxSalary?: number;
  minAge?: number;
  maxAge?: number;
  visaType?: string;
  qualification?: string;
  departmentId?: string;
  roleCatalogId?: string;
  workExperienceCompany?: string;
  heightMin?: number;
  heightMax?: number;
  weightMin?: number;
  weightMax?: number;
  skinTone?: string;
  languageProficiency?: string;
  smartness?: string;
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
}

interface AdvancedFiltersSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CandidateFilters;
  setFilters: (update: any) => void;
  isManagerOrAdmin: boolean;
  isRecruiter: boolean;
  handleResetFilters: () => void;
}

export function AdvancedFiltersSheet({
  isOpen,
  onOpenChange,
  filters,
  setFilters,
  isManagerOrAdmin,
  isRecruiter,
  handleResetFilters,
}: AdvancedFiltersSheetProps) {
  // Local state for staged filters
  const [localFilters, setLocalFilters] = useState<CandidateFilters>(filters);

  // Sync local state when sheet opens or external filters change
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  const handleApply = () => {
    setFilters(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    handleResetFilters();
    // Reset filters prop will trigger the useEffect to update localFilters
  };

  const handleDatePresetClick = (preset: string) => {
    let from: Date | undefined;
    let to: Date | undefined;
    const now = new Date();

    switch (preset) {
      case "today":
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case "yesterday":
        from = startOfDay(subDays(now, 1));
        to = endOfDay(subDays(now, 1));
        break;
      case "this_week":
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "last_week":
        from = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        to = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        break;
      case "this_month":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case "this_year":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        from = startOfDay(startOfYear);
        to = endOfDay(now);
        break;
      case "all":
      default:
        from = undefined;
        to = undefined;
        break;
    }

    setLocalFilters((f) => ({
      ...f,
      dateFilter: preset,
      dateFrom: from,
      dateTo: to,
      page: 1,
    }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetOverlay className="top-[64px] z-40" />
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[320px] flex flex-col p-0 h-[calc(100vh-124px)] top-[74px] right-2 rounded-xl border shadow-2xl z-40"
      >
        <SheetHeader className="px-5 py-3 border-b bg-white flex-shrink-0 rounded-t-xl">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            Filters
          </SheetTitle>
          <SheetDescription className="text-[11px] text-muted-foreground mt-0.5">
            Refine your candidate search
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 bg-gray-50/30">
          {/* Country Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Globe className="h-3 w-3 text-emerald-500" />
              Country
            </label>
            <MultiCountrySelect
              placeholder="Select"
              value={localFilters.countryPreferences}
              onValueChange={(val) => setLocalFilters(f => ({ ...f, countryPreferences: val, page: 1 }))}
              className="bg-white shadow-sm scale-95 origin-left"
            />
          </div>

          {/* Sector Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Building2 className="h-3 w-3 text-purple-500" />
              Sectors
            </label>
            <MultiSelect
              placeholder="Select"
              options={Object.entries(SECTOR_TYPES).map(([key, value]) => ({
                label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                value: value
              }))}
              value={localFilters.sectorTypes}
              onValueChange={(val) => setLocalFilters(f => ({ ...f, sectorTypes: val, page: 1 }))}
              className="bg-white shadow-sm scale-95 origin-left"
            />
          </div>

          {/* Source Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Share2 className="h-3 w-3 text-orange-500" />
              Sources
            </label>
            <MultiSelect
              placeholder="Select"
              options={[
                { label: "Manual", value: "manual" },
                { label: "WhatsApp", value: "whatsapp" },
                { label: "Referral", value: "referral" },
                { label: "LinkedIn", value: "linkedin" },
                { label: "Facebook", value: "facebook" },
                { label: "Indeed", value: "indeed" },
                { label: "Other", value: "other" },
              ]}
              value={localFilters.sources}
              onValueChange={(val) => setLocalFilters(f => ({ ...f, sources: val, page: 1 }))}
              className="bg-white shadow-sm scale-95 origin-left"
            />
          </div>

          {/* Candidate Profile Filter */}
          <div className="space-y-3 border-t border-gray-200 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Candidate Profile</p>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="text-[9px] font-bold uppercase text-gray-500">Gender</label>
                <Select
                  value={localFilters.gender}
                  onValueChange={(val) => setLocalFilters(f => ({ ...f, gender: val, page: 1 }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg border-gray-200 bg-white shadow-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Min Experience (yrs)</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.minExperience ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, minExperience: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Max Experience (yrs)</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.maxExperience ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, maxExperience: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Min Salary</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.minSalary ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, minSalary: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Max Salary</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.maxSalary ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, maxSalary: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Min Age (years)</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.minAge ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, minAge: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Max Age (years)</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.maxAge ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, maxAge: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-gray-500">Visa Type</label>
                <Select
                  value={localFilters.visaType || "any"}
                  onValueChange={(val) => setLocalFilters(f => ({ ...f, visaType: val === 'any' ? undefined : val, page: 1 }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg border-gray-200 bg-white">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All</SelectItem>
                    {Object.entries(VISA_TYPES).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-gray-500">Qualification</label>
                <QualificationSelect
                  value={localFilters.qualification}
                  onValueChange={(val) => setLocalFilters(f => ({ ...f, qualification: val, page: 1 }))}
                  placeholder="e.g., BSc Nursing"
                  className="bg-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Department</label>
                  <DepartmentSelect
                    value={localFilters.departmentId}
                    onValueChange={(val) => setLocalFilters(f => ({ ...f, departmentId: val, roleCatalogId: '', page: 1 }))}
                    placeholder="Select Department"
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Job Title</label>
                  <JobTitleSelect
                    value={localFilters.roleCatalogId}
                    onRoleChange={(role) => setLocalFilters(f => ({ ...f, roleCatalogId: role?.id || '', page: 1 }))}
                    departmentId={localFilters.departmentId}
                    disabled={!localFilters.departmentId}
                    placeholder={localFilters.departmentId ? "Select Job Title" : "Select department first"}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 mt-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Hospital/Company Name</label>
                  <Input
                    value={localFilters.workExperienceCompany ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, workExperienceCompany: e.target.value, page: 1 }))}
                    placeholder="Company"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Height Min (cm)</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.heightMin ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, heightMin: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Height Max (cm)</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.heightMax ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, heightMax: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Weight Min (kg)</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.weightMin ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, weightMin: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-gray-500">Weight Max (kg)</label>
                  <Input
                    type="number"
                    min={0}
                    value={localFilters.weightMax ?? ''}
                    onChange={(e) => setLocalFilters(f => ({ ...f, weightMax: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-gray-500">Skin Tone</label>
                <Select
                  value={localFilters.skinTone || "any"}
                  onValueChange={(val) => setLocalFilters(f => ({ ...f, skinTone: val === 'any' ? '' : val, page: 1 }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg border-gray-200 bg-white shadow-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {Object.values(SKIN_TONES).map((tone) => (
                      <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-gray-500">Language Proficiency</label>
                <Input
                  value={localFilters.languageProficiency ?? ''}
                  onChange={(e) => setLocalFilters(f => ({ ...f, languageProficiency: e.target.value, page: 1 }))}
                  placeholder="e.g., English"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-gray-500">Smartness</label>
                <Select
                  value={localFilters.smartness || "any"}
                  onValueChange={(val) => setLocalFilters(f => ({ ...f, smartness: val === 'any' ? '' : val, page: 1 }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg border-gray-200 bg-white shadow-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {Object.values(SMARTNESS_LEVELS).map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-gray-500">Licensing Exam</label>
                <Input
                  value={localFilters.licensingExam ?? ''}
                  onChange={(e) => setLocalFilters(f => ({ ...f, licensingExam: e.target.value, page: 1 }))}
                  placeholder="e.g., prometric"
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!localFilters.dataFlow}
                  onCheckedChange={(checked) => setLocalFilters(f => ({ ...f, dataFlow: checked === true ? true : undefined, page: 1 }))}
                />
                <span className="text-[10px] text-gray-600">Data Flow</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!localFilters.eligibility}
                  onCheckedChange={(checked) => setLocalFilters(f => ({ ...f, eligibility: checked === true ? true : undefined, page: 1 }))}
                />
                <span className="text-[10px] text-gray-600">Eligibility</span>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <CalendarDays className="h-3 w-3 text-pink-500" />
              Date Range
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: "All" },
                { key: "today", label: "Today" },
                { key: "yesterday", label: "Yest" },
                { key: "this_week", label: "Week" },
                { key: "this_month", label: "Month" },
              ].map((preset) => {
                const isActive = localFilters.dateFilter === preset.key;
                return (
                  <button
                    key={preset.key}
                    onClick={() => handleDatePresetClick(preset.key)}
                    className={`px-2 py-1 text-[10px] font-bold uppercase tracking-tight rounded border transition-all ${
                      isActive 
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-gray-400">From</span>
                <DatePicker 
                  value={localFilters.dateFrom} 
                  showTime={false} 
                  onChange={(d) => setLocalFilters(f => ({ ...f, dateFrom: d || undefined, dateFilter: "custom", page: 1 }))} 
                  placeholder="Start" 
                  compact 
                  className="bg-white scale-90 origin-top-left"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-gray-400">To</span>
                <DatePicker 
                  value={localFilters.dateTo} 
                  showTime={false} 
                  onChange={(d) => setLocalFilters(f => ({ ...f, dateTo: d || undefined, dateFilter: "custom", page: 1 }))}
                  placeholder="End" 
                  compact 
                  disabled={!localFilters.dateFrom} 
                  className="bg-white scale-90 origin-top-left"
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="p-3 border-t bg-white flex-shrink-0 rounded-b-xl">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="flex-1 h-8 text-[11px] border-gray-200 font-bold"
            >
              Reset
            </Button>
            <Button 
              onClick={handleApply}
              className="flex-1 h-8 text-[11px] bg-blue-600 hover:bg-blue-700 font-bold"
            >
              Apply
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

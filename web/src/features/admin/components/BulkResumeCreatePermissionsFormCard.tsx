import { Control, Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUp } from "lucide-react";

export type BulkResumeCreatePermissionFields = {
  bulkResumeCreateEnabled: boolean;
};

export interface BulkResumeCreatePermissionsFormCardProps<
  T extends BulkResumeCreatePermissionFields,
> {
  control: Control<T>;
  disabled?: boolean;
}

export function BulkResumeCreatePermissionsFormCard<
  T extends BulkResumeCreatePermissionFields,
>({
  control,
  disabled = false,
}: BulkResumeCreatePermissionsFormCardProps<T>) {
  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <FileUp className="h-5 w-5 text-blue-600" />
          Bulk resume candidate creation
        </CardTitle>
        <CardDescription className="text-slate-600">
          Grant permission to create candidates by uploading resume PDFs in
          bulk. Manager, CEO, and Director roles retain access via wildcard
          permissions. Recruiter Managers receive this via role seed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Controller
          name={"bulkResumeCreateEnabled" as never}
          control={control}
          render={({ field }) => (
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <Checkbox
                id="bulkResumeCreateEnabled"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={disabled}
                aria-label="Bulk resume candidate creation permission"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="bulkResumeCreateEnabled"
                  className="text-sm font-medium text-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileUp className="h-4 w-4 text-slate-500" />
                  Enable bulk resume create
                </Label>
                <p className="text-xs text-slate-500">
                  Allows uploading multiple resume PDFs to auto-create
                  candidates with rule-based field detection.
                </p>
              </div>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}

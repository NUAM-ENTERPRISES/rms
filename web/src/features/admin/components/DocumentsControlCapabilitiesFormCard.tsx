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
import { FileText, Truck } from "lucide-react";

export type DocumentsControlCapabilityFields = {
  originalDocumentIntakeEnabled: boolean;
  courierManagementEnabled: boolean;
};

export interface DocumentsControlCapabilitiesFormCardProps<
  T extends DocumentsControlCapabilityFields,
> {
  control: Control<T>;
  disabled?: boolean;
}

export function DocumentsControlCapabilitiesFormCard<
  T extends DocumentsControlCapabilityFields,
>({
  control,
  disabled = false,
}: DocumentsControlCapabilitiesFormCardProps<T>) {
  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Documents control access
        </CardTitle>
        <CardDescription className="text-slate-600">
          Grant Original Document Intake and/or Courier Management independently.
          Users with the Documents Control Executive role always retain full
          access via their role.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Controller
          name={"originalDocumentIntakeEnabled" as never}
          control={control}
          render={({ field }) => (
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <Checkbox
                id="originalDocumentIntakeEnabled"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={disabled}
                aria-label="Original Document Intake access"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="originalDocumentIntakeEnabled"
                  className="text-sm font-medium text-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  Original Document Intake
                </Label>
                <p className="text-xs text-slate-500">
                  Physical document collection, scanning, and locker management.
                </p>
              </div>
            </div>
          )}
        />

        <Controller
          name={"courierManagementEnabled" as never}
          control={control}
          render={({ field }) => (
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <Checkbox
                id="courierManagementEnabled"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={disabled}
                aria-label="Courier Management access"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="courierManagementEnabled"
                  className="text-sm font-medium text-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Truck className="h-4 w-4 text-slate-500" />
                  Courier Management
                </Label>
                <p className="text-xs text-slate-500">
                  Courier legs, dispatch, handover, and delivery tracking.
                </p>
              </div>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}

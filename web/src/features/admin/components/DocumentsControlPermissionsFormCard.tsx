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

export type DocumentsControlPermissionFields = {
  originalDocumentIntakeEnabled: boolean;
  courierManagementEnabled: boolean;
};

export interface DocumentsControlPermissionsFormCardProps<
  T extends DocumentsControlPermissionFields,
> {
  control: Control<T>;
  disabled?: boolean;
}

export function DocumentsControlPermissionsFormCard<
  T extends DocumentsControlPermissionFields,
>({
  control,
  disabled = false,
}: DocumentsControlPermissionsFormCardProps<T>) {
  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Documents control permissions
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Grant direct Original Document Intake and/or Courier Management
          permissions to this user. Users with the Documents Control Executive
          role always retain full access via their role.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Controller
          name={"originalDocumentIntakeEnabled" as never}
          control={control}
          render={({ field }) => (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted px-4 py-3">
              <Checkbox
                id="originalDocumentIntakeEnabled"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={disabled}
                aria-label="Original Document Intake permissions"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="originalDocumentIntakeEnabled"
                  className="text-sm font-medium text-foreground flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Original Document Intake
                </Label>
                <p className="text-xs text-muted-foreground">
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
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted px-4 py-3">
              <Checkbox
                id="courierManagementEnabled"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={disabled}
                aria-label="Courier Management permissions"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="courierManagementEnabled"
                  className="text-sm font-medium text-foreground flex items-center gap-2 cursor-pointer"
                >
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Courier Management
                </Label>
                <p className="text-xs text-muted-foreground">
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

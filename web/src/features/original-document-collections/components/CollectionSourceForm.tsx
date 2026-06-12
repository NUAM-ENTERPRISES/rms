import { Control, Controller, UseFormRegister, UseFormWatch } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/molecules/DatePicker";
import { UserSelect } from "@/features/candidates/components/UserSelect";
import { SelectAgent } from "@/components/molecules/SelectAgent";
import {
  COLLECTION_TYPE,
  COLLECTION_TYPE_LABELS,
  COURIER_PARTNERS,
  DIRECT_OFFICE,
  DIRECT_OFFICE_LABELS,
} from "../constants";
import type { CreateCollectionFormValues } from "../schemas/collection-form.schema";

interface CollectionSourceFormProps {
  register: UseFormRegister<CreateCollectionFormValues>;
  control: Control<CreateCollectionFormValues>;
  watch: UseFormWatch<CreateCollectionFormValues>;
  disabled?: boolean;
}

export function CollectionSourceForm({
  register,
  control,
  watch,
  disabled,
}: CollectionSourceFormProps) {
  const collectionType = watch("collectionType");
  const directOffice = watch("directOffice");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="collectionType">Collection Type</Label>
        <Controller
          control={control}
          name="collectionType"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger id="collectionType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(COLLECTION_TYPE).map((type) => (
                  <SelectItem key={type} value={type}>
                    {COLLECTION_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Collected By</Label>
        <Controller
          control={control}
          name="collectedByUserId"
          render={({ field }) => (
            <UserSelect
              value={field.value}
              onChange={field.onChange}
              role={
                collectionType === COLLECTION_TYPE.RECRUITER
                  ? "Recruiter"
                  : undefined
              }
              disabled={disabled}
              placeholder="Select who collected documents"
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Collected Date</Label>
        <Controller
          control={control}
          name="collectedAt"
          render={({ field }) => (
            <DatePicker
              value={field.value ? new Date(field.value) : undefined}
              onChange={(date) =>
                field.onChange(date ? date.toISOString() : "")
              }
              disabled={disabled}
            />
          )}
        />
      </div>

      {collectionType === COLLECTION_TYPE.DIRECT && (
        <>
          <div className="space-y-2">
            <Label>Office</Label>
            <Controller
              control={control}
              name="directOffice"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DIRECT_OFFICE).map((office) => (
                      <SelectItem key={office} value={office}>
                        {DIRECT_OFFICE_LABELS[office]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {directOffice === DIRECT_OFFICE.OTHER && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="directOfficeOther">Office Name</Label>
              <Input
                id="directOfficeOther"
                {...register("directOfficeOther")}
                disabled={disabled}
              />
            </div>
          )}
        </>
      )}

      {collectionType === COLLECTION_TYPE.INTERVIEW_COORDINATOR && (
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="interviewVenue">Interview Venue (optional)</Label>
          <Input
            id="interviewVenue"
            {...register("interviewVenue")}
            disabled={disabled}
          />
        </div>
      )}

      {collectionType === COLLECTION_TYPE.AGENT && (
        <>
          <div className="space-y-2">
            <Label>Agent</Label>
            <Controller
              control={control}
              name="agentId"
              render={({ field }) => (
                <SelectAgent
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agentNameManual">Or Agent Name (manual)</Label>
            <Input
              id="agentNameManual"
              {...register("agentNameManual")}
              disabled={disabled}
            />
          </div>
        </>
      )}

      {collectionType === COLLECTION_TYPE.COURIER && (
        <>
          <div className="space-y-2">
            <Label>Courier Partner (optional)</Label>
            <Controller
              control={control}
              name="courierPartner"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select courier" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURIER_PARTNERS.map((partner) => (
                      <SelectItem key={partner} value={partner}>
                        {partner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trackingNumber">Tracking Number (optional)</Label>
            <Input
              id="trackingNumber"
              {...register("trackingNumber")}
              disabled={disabled}
            />
          </div>
        </>
      )}

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="remarks">Remarks (optional)</Label>
        <Textarea
          id="remarks"
          rows={3}
          {...register("remarks")}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

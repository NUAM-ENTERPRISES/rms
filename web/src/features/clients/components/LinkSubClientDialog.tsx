import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLinkClientSubClientMutation } from "@/features/clients/api";
import {
  CLIENT_TYPE_LABELS,
  CLIENT_TYPES,
} from "@/features/clients/constants/client-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhysicalAddressFields } from "@/components/molecules";

const linkSubSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(CLIENT_TYPES).default("DIRECT_CLIENT"),
    email: z.union([z.literal(""), z.string().email("Invalid email")]).optional(),
    phone: z.string().optional(),
    addressCountryCode: z.string().max(8).optional().or(z.literal("")),
    addressStateId: z.string().optional().or(z.literal("")),
    address: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.addressStateId?.trim() && !data.addressCountryCode?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a country before state",
        path: ["addressCountryCode"],
      });
    }
  });

export type LinkSubClientFormValues = z.infer<typeof linkSubSchema>;

const EMPTY: LinkSubClientFormValues = {
  name: "",
  type: "DIRECT_CLIENT",
  email: "",
  phone: "",
  addressCountryCode: "",
  addressStateId: "",
  address: "",
};

interface LinkSubClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentClientId: string;
  parentName?: string;
}

export function LinkSubClientDialog({
  open,
  onOpenChange,
  parentClientId,
  parentName,
}: LinkSubClientDialogProps) {
  const [linkSubClient, { isLoading }] = useLinkClientSubClientMutation();

  const form = useForm<LinkSubClientFormValues>({
    resolver: zodResolver(linkSubSchema),
    defaultValues: EMPTY,
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset(EMPTY);
    }
  }, [open, form]);

  const submit = async (values: LinkSubClientFormValues) => {
    try {
      const result = await linkSubClient({
        parentClientId,
        body: {
          name: values.name.trim(),
          type: values.type,
          email: values.email?.trim() || undefined,
          phone: values.phone?.trim() || undefined,
          address: values.address?.trim() || undefined,
          addressCountryCode: values.addressCountryCode?.trim() || undefined,
          addressStateId: values.addressStateId?.trim() || undefined,
        },
      }).unwrap();

      toast.success(result.message ?? "Linked end client created.");
      onOpenChange(false);
    } catch (e: unknown) {
      const message =
        e &&
        typeof e === "object" &&
        "data" in e &&
        e.data &&
        typeof e.data === "object" &&
        "message" in e.data &&
        typeof (e.data as { message?: string }).message === "string"
          ? (e.data as { message: string }).message
          : "Could not link end client.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add linked end client</DialogTitle>
          <DialogDescription>
            Create a linked organisation for{" "}
            <span className="font-medium text-slate-700">{parentName ?? "this intermediary"}</span>
            .
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(submit)}
          className="space-y-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="link-sub-name" className="text-sm font-medium text-slate-700">
                End client name <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="name"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="link-sub-name"
                    autoComplete="organization"
                    className="h-10 border-slate-200 focus:border-blue-500 focus-visible:ring-blue-500/20"
                  />
                )}
              />
              {form.formState.errors.name ? (
                <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="link-sub-type" className="text-sm font-medium text-slate-700">
                Client type
              </Label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="link-sub-type"
                      className="h-10 border-slate-200 focus:border-blue-500"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-lg">
                      {CLIENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="py-2 text-sm">
                          {CLIENT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-sub-phone" className="text-sm font-medium text-slate-700">
                Phone
              </Label>
              <Controller
                name="phone"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="link-sub-phone"
                    autoComplete="tel"
                    className="h-10 border-slate-200 focus:border-blue-500"
                  />
                )}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="link-sub-email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <Controller
                name="email"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="link-sub-email"
                    type="email"
                    autoComplete="email"
                    className="h-10 border-slate-200 focus:border-blue-500"
                  />
                )}
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <PhysicalAddressFields<LinkSubClientFormValues>
              control={form.control}
              setValue={form.setValue}
              errors={form.formState.errors}
              title="Address (optional)"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" aria-hidden />
                  Link end client
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

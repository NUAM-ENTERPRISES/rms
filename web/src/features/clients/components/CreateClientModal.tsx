/**
 * Create Client Modal - quick create (Direct, Sub Agent, Freelance)
 */

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Loader2, Building2, Briefcase, Handshake } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateClientMutation, type CreateClientRequest } from "@/features/clients";
import {
  CLIENT_TYPE_LABELS,
  CLIENT_TYPES,
} from "@/features/clients/constants/client-types";

const quickClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  type: z.enum(CLIENT_TYPES),
  subClientName: z.string().optional(),
});

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (clientId: string, clientName: string) => void;
}

function getClientTypeIcon(type: QuickClientFormData["type"]) {
  switch (type) {
    case "DIRECT_CLIENT":
      return Briefcase;
    case "SUB_AGENT":
      return Building2;
    case "FREELANCE":
      return Handshake;
    default:
      return Building2;
  }
}

export function CreateClientModal({
  open,
  onClose,
  onSuccess,
}: CreateClientModalProps) {
  const [createClient, { isLoading }] = useCreateClientMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<QuickClientFormData>({
    resolver: zodResolver(quickClientSchema),
    defaultValues: {
      name: "",
      type: "DIRECT_CLIENT",
      subClientName: "",
    },
  });

  const clientType = watch("type");
  const ClientTypeIcon = getClientTypeIcon(clientType);

  const onSubmit = async (data: QuickClientFormData) => {
    try {
      const payload: CreateClientRequest = {
        name: data.name.trim(),
        type: data.type,
        specialties: [],
        locations: [],
        commissionRate: 0,
      };

      if (
        (data.type === "SUB_AGENT" || data.type === "FREELANCE") &&
        data.subClientName?.trim()
      ) {
        payload.subClient = {
          name: data.subClientName.trim(),
          type: "DIRECT_CLIENT",
        };
      }

      const result = await createClient(payload).unwrap();

      if (result.success) {
        toast.success("Client created successfully!");
        onSuccess?.(result.data.id, result.data.name);
        reset();
        onClose();
      }
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === "object" &&
        "data" in error &&
        error.data &&
        typeof error.data === "object" &&
        "message" in error.data &&
        typeof (error.data as { message?: string }).message === "string"
          ? (error.data as { message: string }).message
          : "Failed to create client";
      toast.error(message);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      onClose();
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <ClientTypeIcon className="h-5 w-5 text-blue-600" />
            Create New Client
          </DialogTitle>
          <DialogDescription>
            Add a client. Sub Agent and Freelance types can optionally link a
            direct (end) client by name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="modal-name" className="text-sm font-medium text-slate-700">
              Client name *
            </Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="modal-name"
                  placeholder="e.g., John Smith, ABC Healthcare"
                  className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  autoFocus
                />
              )}
            />
            {errors.name ? (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modal-type" className="text-sm font-medium text-slate-700">
              Client type *
            </Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    id="modal-type"
                    className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  >
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {CLIENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type ? (
              <p className="text-sm text-red-600">{errors.type.message}</p>
            ) : null}
          </div>

          {(clientType === "SUB_AGENT" || clientType === "FREELANCE") ? (
            <div className="space-y-2">
              <Label
                htmlFor="modal-sub-client"
                className="text-sm font-medium text-slate-700"
              >
                End client name
              </Label>
              <Controller
                name="subClientName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="modal-sub-client"
                    placeholder="Skip or name the linked organisation"
                    className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                )}
              />
              {errors.subClientName ? (
                <p className="text-sm text-red-600">{errors.subClientName.message}</p>
              ) : (
                <p className="text-xs text-slate-500">
                  Leave empty to create this agency/freelancer only.
                </p>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 hover:from-blue-700 hover:to-blue-800"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

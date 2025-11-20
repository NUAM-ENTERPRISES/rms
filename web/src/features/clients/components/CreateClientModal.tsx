/**
 * Create Client Modal - Quick client creation with mandatory fields only
 */

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Loader2, Building2, User, Hospital, ExternalLink } from "lucide-react";
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
import { useCreateClientMutation } from "@/features/clients";

// Minimal schema with only mandatory fields
const quickClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  type: z.enum([
    "INDIVIDUAL",
    "SUB_AGENCY",
    "HEALTHCARE_ORGANIZATION",
    "EXTERNAL_SOURCE",
  ]),
});

type QuickClientFormData = z.infer<typeof quickClientSchema>;

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (clientId: string, clientName: string) => void;
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
      type: "INDIVIDUAL",
    },
  });

  const clientType = watch("type");

  const onSubmit = async (data: QuickClientFormData) => {
    try {
      const result = await createClient({
        ...data,
        specialties: [],
        locations: [],
        commissionRate: 0,
      }).unwrap();

      if (result.success) {
        toast.success("Client created successfully!");
        onSuccess?.(result.data.id, result.data.name);
        reset();
        onClose();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create client");
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

  const getClientTypeIcon = (type: QuickClientFormData["type"]) => {
    switch (type) {
      case "INDIVIDUAL":
        return User;
      case "SUB_AGENCY":
        return Building2;
      case "HEALTHCARE_ORGANIZATION":
        return Hospital;
      case "EXTERNAL_SOURCE":
        return ExternalLink;
      default:
        return Building2;
    }
  };

  const ClientTypeIcon = getClientTypeIcon(clientType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <ClientTypeIcon className="h-5 w-5 text-blue-600" />
            Create New Client
          </DialogTitle>
          <DialogDescription>
            Quickly add a new client with essential information. You can add more
            details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-slate-700">
              Client Name *
            </Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="e.g., John Smith, ABC Healthcare"
                  className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  autoFocus
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Client Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium text-slate-700">
              Client Type *
            </Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Individual Referrer</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SUB_AGENCY">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>Sub Agency</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="HEALTHCARE_ORGANIZATION">
                      <div className="flex items-center gap-2">
                        <Hospital className="h-4 w-4" />
                        <span>Healthcare Organization</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="EXTERNAL_SOURCE">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span>External Source</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Client
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

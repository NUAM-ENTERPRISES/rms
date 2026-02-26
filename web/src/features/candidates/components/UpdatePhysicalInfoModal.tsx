import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Ruler, Weight, Sparkles, Languages, Brain, Save, X } from "lucide-react";
import { useUpdateCandidateMutation } from "@/features/candidates/api";
import { toast } from "sonner";
import { SKIN_TONES, SMARTNESS_LEVELS } from "@/constants/candidate-constants";

const physicalInfoSchema = z.object({
  height: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  skinTone: z.string().optional(),
  languageProficiency: z.string().optional(),
  smartness: z.string().optional(),
});

type PhysicalInfoFormData = z.infer<typeof physicalInfoSchema>;

interface UpdatePhysicalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  initialData: {
    height?: number | null;
    weight?: number | null;
    skinTone?: string | null;
    languageProficiency?: string | null;
    smartness?: string | null;
  };
}

export const UpdatePhysicalInfoModal: React.FC<UpdatePhysicalInfoModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  initialData,
}) => {
  const [updateCandidate, { isLoading }] = useUpdateCandidateMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PhysicalInfoFormData>({
    resolver: zodResolver(physicalInfoSchema),
    defaultValues: {
      height: initialData.height ?? undefined,
      weight: initialData.weight ?? undefined,
      skinTone: initialData.skinTone || "",
      languageProficiency: initialData.languageProficiency || "",
      smartness: initialData.smartness || "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        height: initialData.height ?? undefined,
        weight: initialData.weight ?? undefined,
        skinTone: initialData.skinTone || "",
        languageProficiency: initialData.languageProficiency || "",
        smartness: initialData.smartness || "",
      });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: PhysicalInfoFormData) => {
    try {
      await updateCandidate({
        id: candidateId,
        height: data.height,
        weight: data.weight,
        skinTone: data.skinTone,
        languageProficiency: data.languageProficiency,
        smartness: data.smartness,
      }).unwrap();
      toast.success("Physical information updated successfully");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update physical information");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-teal-600" />
            Update Physical Information
          </DialogTitle>
          <DialogDescription>
            Modify height, weight and other physical details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="height" className="text-slate-700 font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4 text-slate-500" />
                Height (cm)
              </Label>
              <Controller
                name="height"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="height"
                    type="number"
                    step="0.1"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="175"
                    disabled={isLoading}
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.height && <p className="text-sm text-red-600">{errors.height.message}</p>}
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-slate-700 font-medium flex items-center gap-2">
                <Weight className="h-4 w-4 text-slate-500" />
                Weight (kg)
              </Label>
              <Controller
                name="weight"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="weight"
                    type="number"
                    step="0.1"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="70"
                    disabled={isLoading}
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.weight && <p className="text-sm text-red-600">{errors.weight.message}</p>}
            </div>

            {/* Skin Tone */}
            <div className="space-y-2">
              <Label htmlFor="skinTone" className="text-slate-700 font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-500" />
                Skin Tone
              </Label>
              <Controller
                name="skinTone"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Select skin tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKIN_TONES.map((tone) => (
                        <SelectItem key={tone} value={tone}>
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="languageProficiency" className="text-slate-700 font-medium flex items-center gap-2">
                <Languages className="h-4 w-4 text-slate-500" />
                Language Proficiency
              </Label>
              <Controller
                name="languageProficiency"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="languageProficiency"
                    placeholder="English (Fluent), Arabic (Basic)"
                    disabled={isLoading}
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
            </div>

            {/* Smartness */}
            <div className="space-y-2">
              <Label htmlFor="smartness" className="text-slate-700 font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-slate-500" />
                Smartness
              </Label>
              <Controller
                name="smartness"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Select smartness" />
                    </SelectTrigger>
                    <SelectContent>
                      {SMARTNESS_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

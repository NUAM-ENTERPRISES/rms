import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UserSelect } from "@/features/candidates/components/UserSelect";
import { useAssignUserToTeamMutation } from "../api";
import { toast } from "sonner";

const addMemberSchema = z.object({
  userId: z.string().min(1, "Please select a user"),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

const ELIGIBLE_MEMBER_ROLES = [
  "Team Head",
  "Team Lead",
  "Recruiter",
  "Documentation Executive",
  "Processing Executive",
];

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export default function AddMemberDialog({
  open,
  onOpenChange,
  teamId,
}: AddMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignUserToTeam] = useAssignUserToTeamMutation();

  const form = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      userId: "",
    },
  });

  const onSubmit = async (data: AddMemberFormData) => {
    try {
      setIsSubmitting(true);
      await assignUserToTeam({
        teamId,
        userId: data.userId,
        role: "member",
      }).unwrap();

      toast.success("Member added successfully");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add member. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add a new member to this team. You can change their role later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <FormControl>
                    <UserSelect
                      value={field.value}
                      onChange={field.onChange}
                      role={ELIGIBLE_MEMBER_ROLES}
                      placeholder="Select a user"
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

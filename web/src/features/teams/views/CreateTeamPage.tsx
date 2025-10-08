import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Users, Building2, Save, X } from "lucide-react";
import { useCreateTeamMutation } from "@/features/teams";
import { useCan } from "@/hooks/useCan";
import { useUsersLookup } from "@/shared/hooks/useUsersLookup";
import {
  teamFormSchema,
  type TeamFormData,
} from "@/features/teams/schemas/team-schemas";

export default function CreateTeamPage() {
  const navigate = useNavigate();
  const canCreateTeams = useCan("manage:teams");
  const { users, getLeadershipUsers } = useUsersLookup();

  const [createTeam, { isLoading }] = useCreateTeamMutation();

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      leadId: undefined,
      headId: undefined,
      managerId: undefined,
    },
  });

  const onSubmit = async (data: TeamFormData) => {
    try {
      // Prepare form data - convert empty strings and falsy values to undefined
      const formData = {
        name: data.name,
        leadId:
          data.leadId && data.leadId.trim() !== "" ? data.leadId : undefined,
        headId:
          data.headId && data.headId.trim() !== "" ? data.headId : undefined,
        managerId:
          data.managerId && data.managerId.trim() !== ""
            ? data.managerId
            : undefined,
      };

      const result = await createTeam(formData).unwrap();

      if (result.success) {
        toast.success("Team created successfully");
        navigate(`/teams/${result.data.id}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create team");
    }
  };

  if (!canCreateTeams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to create teams.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              Create Team
            </h1>
            <p className="text-slate-600 mt-1">
              Set up a new team with leadership structure
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/teams")}
            className="h-11 px-6 border-slate-200 hover:border-slate-300"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Team Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Team Details
              </CardTitle>
              <CardDescription>
                Basic information about the team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Team Name *
                  </Label>
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="e.g., Healthcare Recruitment Team A"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leadership Structure */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Leadership Structure
              </CardTitle>
              <CardDescription>
                Assign team leadership roles (all optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Team Lead */}
                <div className="space-y-2">
                  <Label
                    htmlFor="leadId"
                    className="text-sm font-medium text-slate-700"
                  >
                    Team Lead
                  </Label>
                  <Controller
                    name="leadId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value || undefined)
                        }
                        value={field.value || undefined}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select team lead" />
                        </SelectTrigger>
                        <SelectContent>
                          {getLeadershipUsers().map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-sm text-slate-500">
                                  {user.role}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.leadId && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.leadId.message}
                    </p>
                  )}
                </div>

                {/* Team Head */}
                <div className="space-y-2">
                  <Label
                    htmlFor="headId"
                    className="text-sm font-medium text-slate-700"
                  >
                    Team Head
                  </Label>
                  <Controller
                    name="headId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value || undefined)
                        }
                        value={field.value || undefined}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select team head" />
                        </SelectTrigger>
                        <SelectContent>
                          {getLeadershipUsers().map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-sm text-slate-500">
                                  {user.role}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.headId && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.headId.message}
                    </p>
                  )}
                </div>

                {/* Team Manager */}
                <div className="space-y-2">
                  <Label
                    htmlFor="managerId"
                    className="text-sm font-medium text-slate-700"
                  >
                    Team Manager
                  </Label>
                  <Controller
                    name="managerId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value || undefined)
                        }
                        value={field.value || undefined}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select team manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {getLeadershipUsers().map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-sm text-slate-500">
                                  {user.role}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.managerId && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.managerId.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/teams")}
              className="h-11 px-6 border-slate-200 hover:border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Team
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Users, Building2, Save, X } from "lucide-react";
import { useGetTeamQuery, useUpdateTeamMutation } from "@/features/teams";
import { useCan } from "@/hooks/useCan";
import { UserSelect } from "@/features/candidates/components/UserSelect";
import {
  teamFormSchema,
  type TeamFormData,
} from "@/features/teams/schemas/team-schemas";

const LEADERSHIP_ROLES = [
  "Director",
  "Manager",
  "Recruitment Lead",
  "Processing Lead",
  "Team Head",
  "Team Lead",
];

export default function EditTeamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canUpdateTeams = useCan("manage:teams");

  const [updateTeam, { isLoading }] = useUpdateTeamMutation();

  const {
    data: teamData,
    isLoading: isLoadingTeam,
    error: teamError,
  } = useGetTeamQuery(id!);

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (teamData?.data) {
      const team = teamData.data;
      form.reset({
        name: team.name,
        leadId: team.leadId || undefined,
        headId: team.headId || undefined,
        managerId: team.managerId || undefined,
      });
    }
  }, [teamData, form]);

  const onSubmit = async (data: TeamFormData) => {
    try {
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

      const result = await updateTeam({
        id: id!,
        body: formData,
      }).unwrap();

      if (result.success) {
        toast.success("Team updated successfully");
        navigate(`/teams/${id}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update team");
    }
  };

  if (!canUpdateTeams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                Access Denied
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                You don't have permission to edit teams.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoadingTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                Loading Team...
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Please wait while we load the team details.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (teamError || !teamData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                Team Not Found
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                The team you're looking for doesn't exist or has been removed.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <Button onClick={() => navigate("/teams")}>
                Go to Teams List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Edit Team
            </h1>
            <p className="text-muted-foreground mt-1">
              Update team details and leadership structure
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/teams/${id}`)}
            className="h-11 px-6 border-border hover:border-border"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Team Details
              </CardTitle>
              <CardDescription>
                Basic information about the team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-foreground"
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
                        className="h-11 border-border focus:border-blue-500 focus:ring-blue-500/20"
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

          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Leadership Structure
              </CardTitle>
              <CardDescription>
                Assign team leadership roles (all optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="leadId"
                    className="text-sm font-medium text-foreground"
                  >
                    Team Lead
                  </Label>
                  <Controller
                    name="leadId"
                    control={form.control}
                    render={({ field }) => (
                      <UserSelect
                        value={field.value ?? ""}
                        onChange={(value) =>
                          field.onChange(value || undefined)
                        }
                        role={LEADERSHIP_ROLES}
                        placeholder="Select team lead"
                        className="w-full"
                      />
                    )}
                  />
                  {form.formState.errors.leadId && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.leadId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="headId"
                    className="text-sm font-medium text-foreground"
                  >
                    Team Head
                  </Label>
                  <Controller
                    name="headId"
                    control={form.control}
                    render={({ field }) => (
                      <UserSelect
                        value={field.value ?? ""}
                        onChange={(value) =>
                          field.onChange(value || undefined)
                        }
                        role={LEADERSHIP_ROLES}
                        placeholder="Select team head"
                        className="w-full"
                      />
                    )}
                  />
                  {form.formState.errors.headId && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.headId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="managerId"
                    className="text-sm font-medium text-foreground"
                  >
                    Team Manager
                  </Label>
                  <Controller
                    name="managerId"
                    control={form.control}
                    render={({ field }) => (
                      <UserSelect
                        value={field.value ?? ""}
                        onChange={(value) =>
                          field.onChange(value || undefined)
                        }
                        role={LEADERSHIP_ROLES}
                        placeholder="Select team manager"
                        className="w-full"
                      />
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

          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/teams/${id}`)}
              className="h-11 px-6 border-border hover:border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || !form.formState.isDirty || !form.formState.isValid
              }
              className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Team
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

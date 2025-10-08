import { useState } from "react";
import {
  UserPlus,
  MoreHorizontal,
  Mail,
  Calendar,
  Settings,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan } from "@/hooks/useCan";
import { TeamMember } from "../api";
import AddMemberDialog from "./AddMemberDialog";
import ChangeRoleDialog from "./ChangeRoleDialog";

interface TeamMembersTableProps {
  members: TeamMember[];
  isLoading: boolean;
  teamId: string;
}

export default function TeamMembersTable({
  members,
  isLoading,
  teamId,
}: TeamMembersTableProps) {
  const canWriteTeams = useCan("write:teams");
  const canManageUsers = useCan("manage:users");
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [changeRoleDialog, setChangeRoleDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    currentRole: string;
  }>({
    open: false,
    userId: "",
    userName: "",
    currentRole: "",
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Loading Team Members...
        </h3>
        <p className="text-muted-foreground">
          Please wait while we fetch the team member data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          Team Members ({Array.isArray(members) ? members.length : 0})
        </h3>
        {canWriteTeams && (
          <Button
            onClick={() => setIsAddMemberDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      {Array.isArray(members) && members.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                        {member.user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {member.user.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {member.user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{member.user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(member.joinedAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManageUsers ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              setChangeRoleDialog({
                                open: true,
                                userId: member.user.id,
                                userName: member.user.name,
                                currentRole: member.role,
                              })
                            }
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="ghost" size="sm" disabled>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <UserPlus className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No team members yet
          </h3>
          <p className="text-slate-600 mb-4">
            Start building your team by adding members.
          </p>
          {canWriteTeams && (
            <Button onClick={() => setIsAddMemberDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add First Member
            </Button>
          )}
        </div>
      )}

      <AddMemberDialog
        open={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        teamId={teamId}
      />

      <ChangeRoleDialog
        open={changeRoleDialog.open}
        onOpenChange={(open) =>
          setChangeRoleDialog((prev) => ({ ...prev, open }))
        }
        userId={changeRoleDialog.userId}
        userName={changeRoleDialog.userName}
        currentRole={changeRoleDialog.currentRole}
      />
    </div>
  );
}

import React, { useMemo } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ui";
import { useGetUsersQuery } from "@/features/admin";
import { useRecruiterNotifyMutation, useDocumentationNotifyMutation } from "@/features/notifications/data/notifications.endpoints";

interface NotifyDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    recruiterId?: string;
    recruiterName?: string;
    recruiterEmail?: string;
    recruiterMobile?: string;
    candidateId?: string;
    candidateName?: string;
    projectId?: string;
    projectName?: string;
    projectRole?: string;
    notes?: string;
    documentationUserId?: string;
  };
  setData: React.Dispatch<React.SetStateAction<any>>;
  onSuccess?: () => void;
}

export const NotifyDocumentationModal: React.FC<NotifyDocumentationModalProps> = ({
  isOpen,
  onClose,
  data,
  setData,
  onSuccess,
}) => {
  const { data: usersResponse, isLoading: isLoadingUsers } = useGetUsersQuery({ limit: 10 }, { skip: !isOpen });
  const [recruiterNotify, { isLoading: isNotifying }] = useRecruiterNotifyMutation();
  const [documentationNotify, { isLoading: isNotifyingDocumentation }] = useDocumentationNotifyMutation();

  const documentationUsers = useMemo(() => {
    if (!usersResponse?.data?.users) return [];
    
    return usersResponse.data.users
      .map(user => ({
        id: user.id,
        name: user.name,
        role: user.userRoles?.[0]?.role?.name || "User"
      }))
      .filter(user => 
        user.role.toLowerCase().includes("documentation") || 
        user.role.toLowerCase().includes("processing")
      );
  }, [usersResponse]);

  const handleConfirm = async () => {
    const recruiterId = data.recruiterId;
    if (!recruiterId) {
      toast.error("No recruiter assigned to this project");
      return;
    }

    try {
      const message = (data.notes && data.notes.trim()) ||
        `Please review the documents for candidate ${data.candidateName || ""}.`;

      const recruiterLink = data.projectId && data.candidateId
        ? `/recruiter-docs/${data.projectId}/${data.candidateId}`
        : data.projectId ? `/recruiter-docs/${data.projectId}` : undefined;

      const documentationLink = data.candidateId && data.projectId
        ? `/candidates/${data.candidateId}/documents/${data.projectId}`
        : undefined;

      // Send to recruiter first
      await recruiterNotify({
        recruiterId: recruiterId,
        message,
        title: "Document Review Required",
        link: recruiterLink,
        meta: {
          candidateId: data.candidateId,
          projectId: data.projectId,
        },
      }).unwrap();

      // Also notify documentation owner / coordinator when possible
      const targetDocumentationUserId = data.documentationUserId;

      if (targetDocumentationUserId) {
        await documentationNotify({
          recipientId: targetDocumentationUserId,
          message,
          title: "Document Review Required",
          link: documentationLink,
          meta: {
            candidateId: data.candidateId,
            projectId: data.projectId,
          },
        }).unwrap();
      }

      toast.success("Notification sent to recruiter and documentation team");
      onClose();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to send notification");
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      className="sm:max-w-lg"
      title={
        data.projectName
          ? `Notify recruiter to upload documents for ${data.projectName}`
          : "Notify recruiter to upload documents"
      }
      description={
        <div className="space-y-3">
          {data.projectName && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-blue-600 font-medium">Project</div>
              <div className="font-semibold text-sm">{data.projectName}</div>
            </div>
          )}

          {data.projectRole && (
            <div className="pt-2">
              <div className="text-xs text-slate-400">Role</div>
              <div className="font-semibold text-sm">{data.projectRole}</div>
            </div>
          )}

          {data.recruiterName && (
            <div className="pt-2">
              <div className="text-xs text-slate-400">Recruiter</div>
              <div className="font-semibold text-sm">{data.recruiterName}</div>
              {data.recruiterEmail && (
                <div className="text-xs text-slate-400 mt-1">Email</div>
              )}
              {data.recruiterEmail && (
                <div className="text-sm">{data.recruiterEmail}</div>
              )}
              {data.recruiterMobile && (
                <div className="text-xs text-slate-400 mt-1">Mobile</div>
              )}
              {data.recruiterMobile && (
                <div className="text-sm">{data.recruiterMobile}</div>
              )}
            </div>
          )}

          {data.candidateName && (
            <div className="pt-2">
              <div className="text-xs text-slate-400">Candidate</div>
              <div className="font-semibold text-sm">{data.candidateName}</div>
            </div>
          )}

          <div className="pt-2">
            <label className="text-xs font-medium mb-1.5 block text-slate-400">Documentation User</label>
            <Select
              value={data.documentationUserId}
              onValueChange={(val) => setData((s: any) => ({ ...s, documentationUserId: val }))}
              disabled={isLoadingUsers}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select documentation user"} />
              </SelectTrigger>
              <SelectContent>
                {documentationUsers.length === 0 && !isLoadingUsers ? (
                  <div className="p-2 text-xs text-slate-500">No documentation users found</div>
                ) : (
                  documentationUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Message (optional)</label>
            <Textarea
              value={data.notes}
              onChange={(e) => setData((s: any) => ({ ...s, notes: e.target.value }))}
              placeholder="Message to recruiter..."
              rows={3}
              className="text-sm"
            />
          </div>
        </div>
      }
      confirmText={isNotifying ? "Sending..." : "Notify"}
      cancelText="Cancel"
      isLoading={isNotifying || isNotifyingDocumentation}
      onConfirm={handleConfirm}
    />
  );
};

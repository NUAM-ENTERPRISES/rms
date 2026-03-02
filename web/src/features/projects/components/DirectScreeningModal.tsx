import React, { useState } from "react";
import {
  ConfirmationDialog,
} from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, AlertCircle, Edit2 } from "lucide-react";
import MatchScoreSummary from "./MatchScoreSummary";
import { cn } from "@/lib/utils";

interface DirectScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  candidateName: string;
  candidateId: string;
  roleNeededId?: string;
  onRoleChange: (roleId: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  projectRoles?: any[];
  allCandidates: any[];
  eligibilityData?: any;
  formatWorkExperienceEntry: (exp: any) => string;
  getMinimalScoreBadgeClass: (score?: number) => string;
}

const DirectScreeningModal: React.FC<DirectScreeningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  candidateName,
  candidateId,
  roleNeededId,
  onRoleChange,
  notes,
  onNotesChange,
  projectRoles,
  allCandidates,
  eligibilityData,
  formatWorkExperienceEntry,
  getMinimalScoreBadgeClass,
}) => {
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const candidate = allCandidates.find(
    (c) => (c.candidateId || c.id) === candidateId
  );

  const nominatedRole = candidate?.nominatedRole;
  const isRoleNominated = nominatedRole !== undefined && nominatedRole !== null;
  const [isEditingRole, setIsEditingRole] = useState(false);

  // Sync internal editing state with nominated role presence and modal open state
  React.useEffect(() => {
    if (isOpen) {
      if (isRoleNominated) {
        setIsEditingRole(false);
        if (nominatedRole?.id && nominatedRole.id !== roleNeededId) {
          onRoleChange(nominatedRole.id);
        }
      } else {
        setIsEditingRole(true);
      }
    }
  }, [isOpen, isRoleNominated, nominatedRole?.id]);

  const handleEditClick = () => {
    setShowEditConfirm(true);
  };

  const confirmEdit = () => {
    setIsEditingRole(true);
    setShowEditConfirm(false);
  };

  const selectedRole = projectRoles?.find((r: any) => r.id === roleNeededId);
  const roleElig = eligibilityData?.roleEligibility?.find(
    (re: any) => re.designation === selectedRole?.designation
  );

  return (
    <>
      <ConfirmationDialog
        isOpen={isOpen}
        className="sm:max-w-2xl"
        onClose={onClose}
        onConfirm={onConfirm}
        title="Send for Direct Screening"
        description={
          <div className="space-y-4">
            <p>
              Are you sure you want to send {candidateName} for
              direct screening? This will notify the screening team.
            </p>

            {/* Candidate Details */}
            {candidate && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                {/* Match score summary */}
                <MatchScoreSummary candidate={candidate} />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Role</label>
                {isRoleNominated && !isEditingRole && (
                   <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-blue-600 hover:text-blue-700"
                    onClick={handleEditClick}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit Role
                  </Button>
                )}
              </div>
              
              <Select
                value={roleNeededId}
                onValueChange={onRoleChange}
                disabled={!isEditingRole}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {projectRoles?.map((r: any) => {
                    const isCandidateNominatedToThis = nominatedRole?.id === r.id;
                    const roleEligibility = eligibilityData?.roleEligibility?.find(
                      (re: any) => re.designation === r.designation
                    );
                    const isEligible = roleEligibility?.isEligible ?? false;

                    return (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center justify-between w-full gap-2">
                          <span className="flex items-center gap-2">
                            {r.designation}
                            {isCandidateNominatedToThis && (
                              <CheckCircle2 className="h-3 w-3 text-green-500 inline" />
                            )}
                          </span>
                          {!isEligible && (
                            <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Eligibility reasons for the selected role */}
              {roleElig && (
                <div className={cn("mt-2 p-3 rounded-lg border", 
                  roleElig.reasons.length === 0
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                )}>
                  <div className={cn("flex items-center gap-2 text-xs font-semibold mb-1", 
                    roleElig.reasons.length === 0 ? 'text-green-700' : 'text-amber-700'
                  )}>
                    {roleElig.reasons.length === 0 ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Eligible for {roleElig.designation}</>
                    ) : (
                      <><AlertCircle className="h-3.5 w-3.5" /> {roleElig.designation} &mdash; Eligibility Issues</>
                    )}
                  </div>
                  {roleElig.reasons.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {roleElig.reasons.map((reason: string, idx: number) => (
                        <li key={idx} className="text-[11px] text-slate-600 italic">{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-green-600 italic">This candidate meets all requirements for this role.</p>
                  )}
                </div>
              )}

              <div className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-100 mt-2">
                This candidate should skip document verification because of
                direct screening. Once screening is completed you should do
                document verification.
              </div>

              <label
                htmlFor="screening-notes"
                className="text-sm font-medium text-gray-700 block mt-3"
              >
                Notes (Optional)
              </label>
              <Textarea
                id="screening-notes"
                placeholder="Add any notes for the screening team..."
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Send for Screening"
        cancelText="Cancel"
        isLoading={isLoading}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Send className="h-5 w-5 text-purple-600" />
          </div>
        }
      />

      <ConfirmationDialog
        isOpen={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={confirmEdit}
        title="Edit assigned role"
        description={`This candidate already has an assigned role (${nominatedRole?.designation}). Do you want to edit it?`}
        confirmText="Edit role"
        cancelText="Cancel"
      />
    </>
  );
};

export default DirectScreeningModal;

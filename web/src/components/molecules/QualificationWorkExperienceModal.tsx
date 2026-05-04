import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationDialog } from "@/components/molecules/DeleteConfirmationDialog";
import {
  X,
  Plus,
  GraduationCap,
  Briefcase,
  Search,
  Upload,
  FileText,
  Eye,
  Trash2,
  Check,
  Edit,
} from "lucide-react";
import { useGetQualificationsQuery } from "@/shared/hooks/useQualificationsLookup";
import { JobTitleSelect, DepartmentSelect } from "@/components/molecules";
import {
  useCreateCandidateQualificationMutation,
  useUpdateCandidateQualificationMutation,
  useCreateWorkExperienceMutation,
  useUpdateWorkExperienceMutation,
  useUploadWorkExperienceDocumentsMutation,
} from "@/features/candidates";
import {
  useDeleteDocumentMutation,
  useUpdateDocumentMutation,
} from "@/features/documents/api";
import { DOCUMENT_TYPE } from "@/constants/document-types";
import type {
  CandidateQualification,
  WorkExperience,
  Document,
} from "@/features/candidates/api";

// Validation schemas
const qualificationSchema = z.object({
  qualificationId: z.string().min(1, "Qualification is required"),
  university: z.string().optional(),
  graduationYear: z.number().min(1950).max(2030).optional(),
  gpa: z.number().min(0).max(4).optional(),
  isCompleted: z.boolean(),
  notes: z.string().optional(),
});

const workExperienceSchema = z.object({
  companyName: z.string().optional(),
  departmentId: z.string().optional(),
  roleCatalogId: z.string().min(1, "Role catalog ID is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  description: z.string().optional(),
  salary: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0).optional().nullable()
  ),
  location: z.string().optional(),
  skills: z.array(z.string()),
  achievements: z.string().optional(),
});

type QualificationFormData = z.infer<typeof qualificationSchema>;
type WorkExperienceFormData = z.infer<typeof workExperienceSchema>;

interface QualificationWorkExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  type: "qualification" | "workExperience";
  editData?: CandidateQualification | WorkExperience;
  existingDocuments?: Document[];
  onSuccess?: () => void;
}

export default function QualificationWorkExperienceModal({
  isOpen,
  onClose,
  candidateId,
  type,
  editData,
  existingDocuments = [],
  onSuccess,
}: QualificationWorkExperienceModalProps) {
  const [newSkill, setNewSkill] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  type PendingCertBatch = { id: string; docName: string; files: File[] };
  const [pendingCertBatches, setPendingCertBatches] = useState<
    PendingCertBatch[]
  >([]);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certDocName, setCertDocName] = useState("");
  const [certFiles, setCertFiles] = useState<File[]>([]);
  const certFileInputRef = useRef<HTMLInputElement>(null);
  const [existingDocs, setExistingDocs] = useState<Document[]>([]);
  const [deletingDocIds, setDeletingDocIds] = useState<Record<string, boolean>>(
    {},
  );
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docNameDrafts, setDocNameDrafts] = useState<Record<string, string>>({});
  const [deleteDocTarget, setDeleteDocTarget] = useState<Document | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setExistingDocs(existingDocuments);
      setDeletingDocIds({});
      setEditingDocId(null);
      setDocNameDrafts({});
    }
  }, [existingDocuments, isOpen]);

  // API hooks - pagination (limit 15)
  // Only fetch qualifications when the modal is open to avoid calling the API on page load
  const { data: qualificationsData, isLoading: isLoadingQualifications } =
    useGetQualificationsQuery(
      {
        q: searchQuery,
        isActive: true,
        page,
        limit: 15,
      },
      { skip: !isOpen }
    );
  const [createQualification, { isLoading: creatingQualification }] =
    useCreateCandidateQualificationMutation();
  const [updateQualification, { isLoading: updatingQualification }] =
    useUpdateCandidateQualificationMutation();
  const [createWorkExperience, { isLoading: creatingWorkExperience }] =
    useCreateWorkExperienceMutation();
  const [updateWorkExperience, { isLoading: updatingWorkExperience }] =
    useUpdateWorkExperienceMutation();
  const [uploadWorkExperienceDocuments, { isLoading: isUploadingCertBatch }] =
    useUploadWorkExperienceDocumentsMutation();
  const [updateDocument] = useUpdateDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();

  const qualifications = qualificationsData?.data?.qualifications || [];

  // Form setup
  const qualificationForm = useForm<QualificationFormData>({
    resolver: zodResolver(qualificationSchema),
    defaultValues: {
      qualificationId: "",
      university: "",
      graduationYear: undefined,
      gpa: undefined,
      isCompleted: true,
      notes: "",
    },
  });

  const workExperienceForm = useForm<WorkExperienceFormData>({
    // z.preprocess on salary makes the resolver typing a bit too strict for RHF generics
    resolver: zodResolver(workExperienceSchema) as any,
    defaultValues: {
      companyName: "",
      jobTitle: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      salary: undefined,
      location: "",
      skills: [],
      achievements: "",
    },
  });

  const isEdit = !!editData;
  const isLoading =
    creatingQualification ||
    updatingQualification ||
    creatingWorkExperience ||
    updatingWorkExperience ||
    isUploadingCertBatch;

  // Initialize form with edit data
  useEffect(() => {
    if (editData && isOpen) {
      if (type === "qualification") {
        const qual = editData as CandidateQualification;
        qualificationForm.reset({
          qualificationId: qual.qualificationId,
          university: qual.university || "",
          graduationYear: qual.graduationYear,
          gpa: qual.gpa,
          isCompleted: qual.isCompleted,
          notes: qual.notes || "",
        });
      } else {
        const exp = editData as WorkExperience;
        const expSkills = Array.isArray(exp.skills) ? exp.skills : [];
        setSkills(expSkills);
        workExperienceForm.reset({
          companyName: exp.companyName,
          departmentId: exp.roleCatalog?.roleDepartmentId || undefined,
          roleCatalogId: exp.roleCatalogId || "",
          jobTitle: exp.jobTitle,
          startDate: exp.startDate.split("T")[0], // Convert to YYYY-MM-DD format
          endDate: exp.endDate ? exp.endDate.split("T")[0] : "",
          isCurrent: exp.isCurrent,
          description: exp.description || "",
          salary: exp.salary,
          location: exp.location || "",
          skills: expSkills,
          achievements: exp.achievements || "",
        });
      }
    } else if (!editData && isOpen) {
      // Reset forms for new entries
      qualificationForm.reset({
        qualificationId: "",
        university: "",
        graduationYear: undefined,
        gpa: undefined,
        isCompleted: true,
        notes: "",
      });
      workExperienceForm.reset({
        companyName: "",
        departmentId: undefined,
        roleCatalogId: "",
        jobTitle: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
        salary: undefined,
        location: "",
        skills: [],
        achievements: "",
      });
      setSkills([]);
    }
    // Reset search query when modal opens
    if (isOpen) {
      setSearchQuery("");
      setIsDropdownOpen(false);
    }
  }, [editData, isOpen, type, qualificationForm, workExperienceForm]);

  const handleQualificationSubmit = async (data: QualificationFormData) => {
    try {
      if (isEdit) {
        await updateQualification({
          id: (editData as CandidateQualification).id,
          ...data,
        }).unwrap();
      } else {
        await createQualification({
          candidateId,
          ...data,
        }).unwrap();
      }
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to save qualification");
    }
  };

  const handleWorkExperienceSubmit = async (data: WorkExperienceFormData) => {
    try {
      const { departmentId, ...dataWithoutDepartmentId } = data;
      const payload = {
        ...dataWithoutDepartmentId,
        skills: JSON.stringify(skills),
        // Handle endDate - if current position is selected, omit endDate completely.
        endDate:
          dataWithoutDepartmentId.isCurrent ||
          !dataWithoutDepartmentId.endDate ||
          dataWithoutDepartmentId.endDate.trim() === ""
            ? undefined
            : new Date(dataWithoutDepartmentId.endDate).toISOString(),
        // Handle salary - only include if it's a valid number
        salary:
          dataWithoutDepartmentId.salary !== undefined && dataWithoutDepartmentId.salary !== null
            ? dataWithoutDepartmentId.salary
            : undefined,
      };

      let workExperienceId: string;
      if (isEdit) {
        const result = await updateWorkExperience({
          id: (editData as WorkExperience).id,
          ...payload,
        }).unwrap();
        workExperienceId = (result as WorkExperience)?.id ?? (editData as WorkExperience).id;
      } else {
        const result = await createWorkExperience({
          candidateId,
          ...payload,
        }).unwrap();
        workExperienceId = (result as WorkExperience)?.id;
      }

      if (pendingCertBatches.length > 0 && workExperienceId) {
        const failedBatches: string[] = [];
        for (const batch of pendingCertBatches) {
          if (batch.files.length === 0) continue;
          try {
            const res = await uploadWorkExperienceDocuments({
              candidateId,
              workExperienceId,
              docType: DOCUMENT_TYPE.EXPERIENCE_LETTERS,
              docName: batch.docName || data.companyName?.trim() || undefined,
              files: batch.files,
            }).unwrap();
            if (res.data?.failedFileNames?.length) {
              failedBatches.push(
                ...res.data.failedFileNames.map((n) => `${batch.docName || "Batch"}: ${n}`)
              );
            }
          } catch {
            failedBatches.push(batch.docName || "Unnamed batch");
          }
        }
        if (failedBatches.length > 0) {
          toast.warning(
            `Work experience saved but some certificate file(s) failed: ${failedBatches.slice(0, 3).join(", ")}${failedBatches.length > 3 ? "…" : ""}`
          );
        }
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to save work experience");
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      const updatedSkills = [...skills, newSkill.trim()];
      setSkills(updatedSkills);
      workExperienceForm.setValue("skills", updatedSkills);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter((skill) => skill !== skillToRemove);
    setSkills(updatedSkills);
    workExperienceForm.setValue("skills", updatedSkills);
  };

  const handleClose = () => {
    qualificationForm.reset();
    workExperienceForm.reset();
    setSkills([]);
    setNewSkill("");
    setSearchQuery("");
    setIsDropdownOpen(false);
    setPendingCertBatches([]);
    setCertModalOpen(false);
    setCertDocName("");
    setCertFiles([]);
    setExistingDocs([]);
    setDeletingDocIds({});
    setEditingDocId(null);
    setDocNameDrafts({});
    setDeleteDocTarget(null);
    setIsDeleteModalOpen(false);
    if (certFileInputRef.current) certFileInputRef.current.value = "";
    onClose();
  };

  const handleDeleteExistingDoc = async (doc: Document) => {
    if (!doc?.id) return;
    setDeletingDocIds((prev) => ({ ...prev, [doc.id]: true }));
    try {
      await deleteDocument(doc.id).unwrap();
      setExistingDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Certificate deleted");
      onSuccess?.();
      // Close confirmation modal after successful delete
      closeDeleteModal();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete certificate");
    } finally {
      setDeletingDocIds((prev) => ({ ...prev, [doc.id]: false }));
    }
  };

  const startEditDocName = (doc: Document) => {
    setEditingDocId(doc.id);
    setDocNameDrafts((prev) => ({
      ...prev,
      [doc.id]: doc.docName ?? "",
    }));
  };

  const cancelEditDocName = () => {
    setEditingDocId(null);
  };

  const saveDocName = async (doc: Document) => {
    const draft = (docNameDrafts[doc.id] ?? "").trim();
    try {
      const updated = await updateDocument({
        id: doc.id,
        docName: draft || undefined,
      }).unwrap();

      const updatedDoc = (updated as any)?.data ?? null;
      setExistingDocs((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                docName:
                  updatedDoc?.docName !== undefined
                    ? updatedDoc.docName
                    : draft || undefined,
              }
            : d,
        ),
      );
      toast.success("Doc name updated");
      setEditingDocId(null);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update doc name");
    }
  };

  const openDeleteModal = (doc: Document) => {
    setDeleteDocTarget(doc);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteDocTarget(null);
  };

  const newBatchId = () =>
    globalThis.crypto?.randomUUID?.() ??
    `batch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const openCertModal = () => {
    setCertDocName("");
    setCertFiles([]);
    if (certFileInputRef.current) certFileInputRef.current.value = "";
    setCertModalOpen(true);
  };

  const closeCertModal = () => {
    setCertModalOpen(false);
    setCertDocName("");
    setCertFiles([]);
    if (certFileInputRef.current) certFileInputRef.current.value = "";
  };

  const confirmCertModal = () => {
    if (certFiles.length === 0) {
      toast.error("Select at least one file to add.");
      return;
    }
    setPendingCertBatches((prev) => [
      ...prev,
      { id: newBatchId(), docName: certDocName.trim(), files: [...certFiles] },
    ]);
    closeCertModal();
  };

  const addCertFilesFromInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setCertFiles((prev) => [...prev, ...files]);
      e.target.value = "";
    }
  };

  const removeCertFileAt = (idx: number) => {
    setCertFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <>
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "qualification" ? (
              <>
                <GraduationCap className="h-5 w-5 text-blue-600" />
                {isEdit
                  ? "Edit Educational Qualification"
                  : "Add Educational Qualification"}
              </>
            ) : (
              <>
                <Briefcase className="h-5 w-5 text-blue-600" />
                {isEdit ? "Edit Work Experience" : "Add Work Experience"}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {type === "qualification"
              ? "Add or update educational qualification details for this candidate."
              : "Add or update work experience details for this candidate."}
          </DialogDescription>
        </DialogHeader>

        {type === "qualification" ? (
          <form
            onSubmit={qualificationForm.handleSubmit(handleQualificationSubmit)}
            className="space-y-4"
          >
            {/* Qualification Selection */}
            <div className="space-y-2">
              <Label htmlFor="qualificationId">Qualification *</Label>
              <Controller
                name="qualificationId"
                control={qualificationForm.control}
                render={({ field }) => (
                  <DropdownMenu
                    open={isDropdownOpen}
                    onOpenChange={setIsDropdownOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-slate-600"
                      >
                        {field.value
                          ? qualifications.find((q) => q.id === field.value)
                              ?.name || "Select a qualification"
                          : "Select a qualification"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full" align="start">
                      <DropdownMenuLabel>
                        Search Qualifications
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Search qualifications..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8"
                          />
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-64">
                        {isLoadingQualifications ? (
                          <div className="p-4 text-center text-sm text-slate-500">
                            Loading qualifications...
                          </div>
                        ) : qualifications.length === 0 ? (
                          <div className="p-4 text-center text-sm text-slate-500">
                            {searchQuery
                              ? "No qualifications found matching your search"
                              : "No qualifications available"}
                          </div>
                        ) : (
                          qualifications.map((qualification) => (
                            <DropdownMenuItem
                              key={qualification.id}
                              onSelect={() => {
                                field.onChange(qualification.id);
                                setIsDropdownOpen(false);
                                setSearchQuery("");
                              }}
                              className="flex items-start gap-2 p-3"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-800">
                                  {qualification.name}
                                </div>
                                {qualification.shortName && (
                                  <div className="text-xs text-slate-500">
                                    {qualification.shortName}
                                  </div>
                                )}
                                <div className="text-xs text-slate-600">
                                  {qualification.level} • {qualification.field}
                                </div>
                              </div>
                            </DropdownMenuItem>
                          ))
                        )}
                      </ScrollArea>
                      <DropdownMenuSeparator />
                      <div className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-500">
                          Page {qualificationsData?.data?.pagination?.page || page} of {qualificationsData?.data?.pagination?.totalPages || 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(qualificationsData?.data?.pagination?.page || page) <= 1}>
                            Prev
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setPage((p) => (qualificationsData?.data?.pagination?.totalPages ? Math.min(qualificationsData?.data?.pagination?.totalPages, p + 1) : p + 1))} disabled={(qualificationsData?.data?.pagination?.page || page) >= (qualificationsData?.data?.pagination?.totalPages || 1)}>
                            Next
                          </Button>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              />
              {qualificationForm.formState.errors.qualificationId && (
                <p className="text-sm text-red-600">
                  {qualificationForm.formState.errors.qualificationId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* University */}
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Input
                  {...qualificationForm.register("university")}
                  placeholder="University name"
                />
              </div>

              {/* Graduation Year */}
              <div className="space-y-2">
                <Label htmlFor="graduationYear">Graduation Year</Label>
                <Input
                  type="number"
                  {...qualificationForm.register("graduationYear", {
                    valueAsNumber: true,
                  })}
                  placeholder="2020"
                  min="1950"
                  max="2030"
                />
              </div>

              {/* GPA */}
              <div className="space-y-2">
                <Label htmlFor="gpa">GPA</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...qualificationForm.register("gpa", {
                    valueAsNumber: true,
                  })}
                  placeholder="3.8"
                  min="0"
                  max="4"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="isCompleted"
                  control={qualificationForm.control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? "completed" : "in-progress"}
                      onValueChange={(value) =>
                        field.onChange(value === "completed")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                {...qualificationForm.register("notes")}
                placeholder="Additional notes about this qualification..."
                rows={3}
              />
            </div>

            {/* Submit Button for Qualification */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isLoading
                  ? "Saving..."
                  : isEdit
                  ? "Update"
                  : "Add Qualification"}
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={workExperienceForm.handleSubmit(
              handleWorkExperienceSubmit as any
            )}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-2">
                <Controller
                  name="departmentId"
                  control={workExperienceForm.control}
                  render={({ field }) => (
                    <DepartmentSelect
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Clear roleCatalogId and jobTitle when department changes
                        workExperienceForm.setValue("roleCatalogId", "");
                        workExperienceForm.setValue("jobTitle", "");
                      }}
                      label="Department"
                      placeholder="Select department"
                    />
                  )}
                />
              </div>

              {/* Job Title */}
              <div className="space-y-2">
                <Controller
                  name="jobTitle"
                  control={workExperienceForm.control}
                  render={({ field }) => (
                    <JobTitleSelect
                      value={field.value}
                      onRoleChange={(role) => {
                        if (role) {
                          workExperienceForm.setValue("roleCatalogId", role.id);
                          workExperienceForm.setValue("jobTitle", role.label || role.name);
                        } else {
                          workExperienceForm.setValue("roleCatalogId", "");
                          workExperienceForm.setValue("jobTitle", "");
                        }
                      }}
                      label="Job Title"
                      placeholder={
                        workExperienceForm.watch("departmentId")
                          ? "e.g., Registered Nurse"
                          : "Select a department first"
                      }
                      required
                      allowEmpty={false}
                      departmentId={workExperienceForm.watch("departmentId")}
                      disabled={!workExperienceForm.watch("departmentId")}
                    />
                  )}
                />
                {workExperienceForm.formState.errors.jobTitle && (
                  <p className="text-sm text-red-600">
                    {workExperienceForm.formState.errors.jobTitle.message}
                  </p>
                )}
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Hospital Name</Label>
                <Input
                  {...workExperienceForm.register("companyName")}
                  placeholder="ABC Hospital"
                />
                {workExperienceForm.formState.errors.companyName && (
                  <p className="text-sm text-red-600">
                    {workExperienceForm.formState.errors.companyName.message}
                  </p>
                )}
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  type="date"
                  {...workExperienceForm.register("startDate")}
                />
                {workExperienceForm.formState.errors.startDate && (
                  <p className="text-sm text-red-600">
                    {workExperienceForm.formState.errors.startDate.message}
                  </p>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  type="date"
                  {...workExperienceForm.register("endDate")}
                  disabled={workExperienceForm.watch("isCurrent")}
                />
              </div>

              {/* Current Position */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCurrent"
                  checked={workExperienceForm.watch("isCurrent")}
                  onCheckedChange={(checked) => {
                    const isCurrent = !!checked;
                    workExperienceForm.setValue("isCurrent", isCurrent);
                    if (isCurrent) {
                      workExperienceForm.setValue("endDate", "");
                    }
                  }}
                />
                <Label htmlFor="isCurrent">This is my current position</Label>
              </div>

              {/* Salary */}
              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input
                  type="number"
                  {...workExperienceForm.register("salary", {
                    valueAsNumber: true,
                    setValueAs: (value) => {
                      if (
                        value === "" ||
                        value === null ||
                        value === undefined
                      ) {
                        return undefined;
                      }
                      const num = Number(value);
                      return isNaN(num) ? undefined : num;
                    },
                  })}
                  placeholder="50000"
                  min="0"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  {...workExperienceForm.register("location")}
                  placeholder="New York, NY"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                {...workExperienceForm.register("description")}
                placeholder="Describe your responsibilities and achievements..."
                rows={3}
              />
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills Gained/Used</Label>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Add a skill..."
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Achievements */}
            <div className="space-y-2">
              <Label htmlFor="achievements">Key Achievements</Label>
              <Textarea
                {...workExperienceForm.register("achievements")}
                placeholder="Describe your key achievements in this role..."
                rows={2}
              />
            </div>

            {/* Experience certificates */}
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label className="text-sm font-semibold text-slate-800">
                    Experience certificates
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    PDF or images. Add documents before saving; they upload after work experience is saved.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openCertModal}
                  className="shrink-0"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add document
                </Button>
              </div>

              {existingDocs.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Uploaded
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {existingDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium overflow-hidden"
                      >
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-emerald-100 transition-colors min-w-0"
                          title={`View: ${doc.docName ? `${doc.docName} : ` : ""}${doc.fileName}`}
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {doc.docName ? `${doc.docName} : ` : ""}
                            {doc.fileName}
                          </span>
                          <Eye className="h-2.5 w-2.5 shrink-0 opacity-60" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEditDocName(doc);
                          }}
                          className="px-2 py-1 text-emerald-700/70 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          aria-label={`Edit doc name for ${doc.fileName}`}
                          title="Edit doc name"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openDeleteModal(doc);
                          }}
                          disabled={!!deletingDocIds[doc.id]}
                          className="px-2 py-1 text-emerald-700/70 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          aria-label={`Delete ${doc.fileName}`}
                          title="Delete certificate"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingCertBatches.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Pending upload
                  </p>
                  <ul className="flex flex-col gap-2">
                    {pendingCertBatches.map((batch) => (
                      <li
                        key={batch.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-blue-900"
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-medium">
                            {batch.docName || "Experience letter"}
                          </span>
                          <span className="text-blue-700/80">
                            {" "}
                            · {batch.files.length} file
                            {batch.files.length === 1 ? "" : "s"}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingCertBatches((prev) =>
                              prev.filter((b) => b.id !== batch.id)
                            )
                          }
                          className="shrink-0 text-blue-500 hover:text-red-600 transition-colors"
                          aria-label="Remove pending upload"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Submit Button for Work Experience */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isUploadingCertBatch
                  ? "Uploading certificates..."
                  : isLoading
                  ? "Saving..."
                  : isEdit
                  ? "Update"
                  : "Add Work Experience"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>

    <Dialog
      open={certModalOpen}
      onOpenChange={(open) => {
        if (!open) closeCertModal();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add experience certificate</DialogTitle>
          <DialogDescription>
            Optional label for this group of files. Upload one or more PDFs or images.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="cert-doc-name">Document name</Label>
            <Input
              id="cert-doc-name"
              value={certDocName}
              onChange={(e) => setCertDocName(e.target.value)}
              placeholder="e.g. Aster Hospital"
            />
            <p className="text-[11px] text-muted-foreground">
              Shown as a prefix before the file name when viewing the certificate.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Files</Label>
            <input
              ref={certFileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={addCertFilesFromInput}
            />
            {certFiles.length > 0 && (
              <ul className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-2">
                {certFiles.map((file, idx) => (
                  <li
                    key={`${file.name}-${idx}`}
                    className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-800 max-w-full"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeCertFileAt(idx)}
                      className="text-slate-500 hover:text-red-600"
                      aria-label="Remove file"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => certFileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {certFiles.length > 0 ? "Add more files" : "Choose files"}
            </Button>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={closeCertModal}>
            Cancel
          </Button>
          <Button type="button" onClick={confirmCertModal}>
            Add to list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={!!editingDocId}
      onOpenChange={(open) => {
        if (!open) cancelEditDocName();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit certificate label</DialogTitle>
          <DialogDescription>
            Updates how this file is labeled alongside “Experience letter”.
          </DialogDescription>
        </DialogHeader>
        {editingDocId ? (
          <div className="space-y-2 py-1">
            <Label htmlFor="edit-cert-doc-name">Document name</Label>
            <Input
              id="edit-cert-doc-name"
              value={docNameDrafts[editingDocId] ?? ""}
              onChange={(e) =>
                setDocNameDrafts((prev) => ({
                  ...prev,
                  [editingDocId]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEditDocName();
                }
              }}
              placeholder="e.g., Aster"
            />
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={cancelEditDocName}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              const doc = existingDocs.find((d) => d.id === editingDocId);
              if (doc) void saveDocName(doc);
            }}
            disabled={!editingDocId}
          >
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DeleteConfirmationDialog
      isOpen={isDeleteModalOpen}
      onClose={closeDeleteModal}
      onConfirm={() => {
        if (!deleteDocTarget) return;
        handleDeleteExistingDoc(deleteDocTarget);
      }}
      title={deleteDocTarget?.fileName ?? "Certificate"}
      itemType="certificate"
      description="Are you sure you want to delete this certificate? This action cannot be undone."
      isLoading={
        deleteDocTarget?.id ? !!deletingDocIds[deleteDocTarget.id] : false
      }
    />
    </>
  );
}

import React, { useState } from "react";
const CandidateUploadDocumentModal = React.lazy(() => import("../../recruiter-docs/components/CandidateUploadDocumentModal"));
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useGetDocumentsQuery, useUploadDocumentMutation } from "../api";
import { useCreateDocumentMutation } from "@/features/documents/api";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { DateUtils } from "@/shared/utils/date";

// Document type options based on backend constants
const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport", category: "identity" },
  { value: "aadhaar", label: "Aadhaar Card", category: "identity" },
  { value: "pan_card", label: "PAN Card", category: "identity" },
  { value: "driving_license", label: "Driving License", category: "identity" },
  { value: "voter_id", label: "Voter ID", category: "identity" },
  {
    value: "professional_license",
    label: "Professional License",
    category: "professional",
  },
  {
    value: "nursing_license",
    label: "Nursing License",
    category: "professional",
  },
  {
    value: "medical_license",
    label: "Medical License",
    category: "professional",
  },
  {
    value: "registration_certificate",
    label: "Registration Certificate",
    category: "professional",
  },
  { value: "degree", label: "Degree Certificate", category: "educational" },
  { value: "diploma", label: "Diploma Certificate", category: "educational" },
  { value: "certificate", label: "Certificate", category: "educational" },
  { value: "transcript", label: "Transcript", category: "educational" },
  { value: "marksheet", label: "Marksheet", category: "educational" },
  { value: "resume", label: "Resume", category: "employment" },
  { value: "cv", label: "Curriculum Vitae", category: "employment" },
  {
    value: "experience_letter",
    label: "Experience Letter",
    category: "employment",
  },
  {
    value: "relieving_letter",
    label: "Relieving Letter",
    category: "employment",
  },
  { value: "salary_slip", label: "Salary Slip", category: "employment" },
  {
    value: "appointment_letter",
    label: "Appointment Letter",
    category: "employment",
  },
  {
    value: "background_check",
    label: "Background Check",
    category: "verification",
  },
  {
    value: "police_clearance",
    label: "Police Clearance",
    category: "verification",
  },
  {
    value: "reference_letter",
    label: "Reference Letter",
    category: "verification",
  },
  {
    value: "medical_certificate",
    label: "Medical Certificate",
    category: "medical",
  },
  {
    value: "medical_fitness",
    label: "Medical Fitness Report",
    category: "medical",
  },
  {
    value: "vaccination_certificate",
    label: "Vaccination Certificate",
    category: "medical",
  },
  {
    value: "covid_vaccination",
    label: "COVID-19 Vaccination",
    category: "medical",
  },
  {
    value: "medical_insurance",
    label: "Medical Insurance",
    category: "medical",
  },
  { value: "photo", label: "Photograph", category: "other" },
  { value: "bank_details", label: "Bank Account Details", category: "other" },
  { value: "offer_letter", label: "Offer Letter", category: "other" },
  { value: "joining_letter", label: "Joining Letter", category: "other" },
  { value: "other", label: "Other Document", category: "other" },
];

const uploadSchema = z.object({
  docType: z.string().min(1, "Document type is required"),
  file: z.custom<File>((value) => value instanceof File, {
    message: "File is required",
  }),
  documentNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface DocumentUploadSectionProps {
  candidateId: string;
}

export function DocumentUploadSection({
  candidateId,
}: DocumentUploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string; fileName: string } | null>(null);

  const {
    data: documentsData,
    isLoading,
    refetch,
  } = useGetDocumentsQuery({
    candidateId,
    page: 1,
    limit: 100,
  });

  const [uploadDocument] = useUploadDocumentMutation();
  const [createDocument] = useCreateDocumentMutation();

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      docType: "",
      documentNumber: "",
      expiryDate: "",
      notes: "",
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      form.setValue("file", file);
    }
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("docType", data.docType);
      if (data.documentNumber)
        formData.append("documentNumber", data.documentNumber);
      if (data.expiryDate) formData.append("expiryDate", data.expiryDate);
      if (data.notes) formData.append("notes", data.notes);

      await uploadDocument({
        candidateId,
        formData,
      }).unwrap();

      toast.success("Document uploaded successfully");
      form.reset();
      setSelectedFile(null);
      refetch();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const normalized = (status || "").toLowerCase();
    switch (normalized) {
      case "verified":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "rejected":
        return <X className="h-4 w-4 text-red-600" />;
      case "resubmission_required":
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const normalized = (status || "").toLowerCase();
    switch (normalized) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "resubmission_required":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            Waiting for re-submission
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // API returns: { success: true, data: { documents: [...], pagination: ... } }
  const documents = documentsData?.data?.documents || [];

  return (
    <div className="space-y-8">


  {/* ===== UPLOADED DOCUMENTS LIST ===== */}
  <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden">
    <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-100">
      <div className="flex items-center w-full justify-between">
        <div>
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
            <div className="p-2 bg-gray-100 rounded-xl">
              <FileText className="h-6 w-6 text-gray-700" />
            </div>
            Uploaded Documents
          </CardTitle>
          <CardDescription className="text-slate-600">
            All candidate documents • Click to view or download
          </CardDescription>
        </div>
        <div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowUploadModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload New Document
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent className="p-0">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600" />
        </div>
      ) : documents.length === 0 ? (
        /* Beautiful Empty State */
        <div className="py-20 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <div className="w-28 h-28 mx-auto bg-gradient-to-br from-gray-100 to-slate-100 rounded-full flex items-center justify-center shadow-inner">
              <FileText className="h-14 w-14 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">No Documents Uploaded</h3>
              <p className="text-slate-600 mt-2">
                Start by uploading the candidate's resume, ID, certificates, or other required files.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70">
              <TableHead className="font-semibold text-slate-700">Document</TableHead>
              <TableHead className="font-semibold text-slate-700">Type</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="font-semibold text-slate-700">Uploaded</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc: any) => (
              <TableRow key={doc.id} className="hover:bg-indigo-50/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{doc.fileName}</p>
                      {doc.documentNumber && (
                        <p className="text-sm text-slate-600">#{doc.documentNumber}</p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="font-medium w-fit">
                      {DOCUMENT_TYPES.find((t) => t.value === doc.docType)?.label ||
                        doc.docType}
                    </Badge>
                    {doc.docType === "resume" && doc.roleCatalog?.label && (
                      <span className="text-xs text-slate-500 font-medium px-1">
                        {doc.roleCatalog.label}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.status)}
                    {getStatusBadge(doc.status)}
                  </div>
                </TableCell>

                <TableCell className="text-slate-700">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    {DateUtils.formatDateTime(doc.createdAt)}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewDoc({ fileUrl: doc.fileUrl, fileName: doc.fileName });
                        if ((doc.mimeType || "").startsWith("application/pdf")) {
                          setIsPDFViewerOpen(true);
                        } else {
                          window.open(doc.fileUrl, "_blank");
                        }
                      }}
                      className="hover:bg-indigo-100 hover:text-indigo-700"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const link = window.document.createElement("a");
                        link.href = doc.fileUrl;
                        link.download = doc.fileName;
                        link.rel = "noopener";
                        window.document.body.appendChild(link);
                        link.click();
                        window.document.body.removeChild(link);
                      }}
                      className="hover:bg-green-100 hover:text-green-700"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>

  {/* Lazy-loaded Upload Modal */}
  <React.Suspense fallback={null}>
    <CandidateUploadDocumentModal
      isOpen={showUploadModal}
      onClose={() => setShowUploadModal(false)}
      onUpload={async (file: File, meta: any) => {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("docType", meta.docType);

          const response = await uploadDocument({ candidateId, formData }).unwrap();
          const uploadData = response.data;

          await createDocument({
            candidateId,
            docType: meta.docType,
            fileName: uploadData.fileName,
            fileUrl: uploadData.fileUrl,
            fileSize: uploadData.fileSize,
            mimeType: uploadData.mimeType,
            documentNumber: meta.documentNumber,
            expiryDate: meta.expiryDate ? new Date(meta.expiryDate).toISOString() : undefined,
            notes: meta.notes,
            roleCatalogId: meta.roleCatalogId,
          }).unwrap();

          toast.success("Document uploaded successfully");
          setShowUploadModal(false);
          refetch();
        } catch (error) {
          console.error("Upload error:", error);
          toast.error("Failed to upload document");
        }
      }}
      isUploading={isUploading}
    />
  </React.Suspense>

  {/* PDF Viewer for existing documents */}
  {previewDoc && (
    <PDFViewer
      fileUrl={previewDoc.fileUrl}
      fileName={previewDoc.fileName}
      isOpen={isPDFViewerOpen}
      onClose={() => {
        setIsPDFViewerOpen(false);
        setPreviewDoc(null);
      }}
      showDownload={true}
      showZoomControls={true}
      showRotationControls={true}
      showFullscreenToggle={true}
    />
  )}

</div>
  );
}

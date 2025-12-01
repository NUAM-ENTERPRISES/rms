import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { useGetDocumentsQuery, useUploadDocumentMutation } from "../api";
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
  file: z.any().refine((file) => file && file.length > 0, "File is required"),
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
    switch (status) {
      case "VERIFIED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "REJECTED":
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const documents = documentsData?.data?.documents || [];

  return (
    <div className="space-y-8">

  {/* ===== UPLOAD DOCUMENT CARD ===== */}
  <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden">
    <CardHeader className="bg-gradient-to-r">
      <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
        <div className="p-2 bg-indigo-100 rounded-xl">
          <Upload className="h-6 w-6 text-indigo-600" />
        </div>
        Upload Document
      </CardTitle>
      <CardDescription className="text-slate-600 mt-1">
        Upload required documents (PDF only) for verification and compliance
      </CardDescription>
    </CardHeader>

    <CardContent className="pt-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Document Type */}
            <FormField
              control={form.control}
              name="docType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Document Type <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Choose document type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{type.label}</span>
                            <Badge variant="secondary" className="ml-3 text-xs">
                              {type.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Number */}
            <FormField
              control={form.control}
              name="documentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Document Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., A12345678, PP987654" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Expiry Date */}
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-11" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel className="font-semibold">PDF File <span className="text-red-500">*</span></FormLabel>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 text-indigo-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Click to upload PDF</p>
                  <p className="text-xs text-slate-500 mt-1">Max size: 10MB</p>
                </label>
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-green-800">{selectedFile.name}</p>
                    <p className="text-xs text-green-700">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Notes (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Renewed version, verified by HR..."
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-400 shadow-lg"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                Uploading Document...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </form>
      </Form>
    </CardContent>
  </Card>

  {/* ===== UPLOADED DOCUMENTS LIST ===== */}
  <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden">
    <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-100">
      <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
        <div className="p-2 bg-gray-100 rounded-xl">
          <FileText className="h-6 w-6 text-gray-700" />
        </div>
        Uploaded Documents
      </CardTitle>
      <CardDescription className="text-slate-600">
        All candidate documents • Click to view or download
      </CardDescription>
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
            {documents.map((document: any) => (
              <TableRow key={document.id} className="hover:bg-indigo-50/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{document.fileName}</p>
                      {document.documentNumber && (
                        <p className="text-sm text-slate-600">#{document.documentNumber}</p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className="font-medium">
                    {DOCUMENT_TYPES.find(t => t.value === document.docType)?.label || document.docType}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(document.status)}
                    {getStatusBadge(document.status)}
                  </div>
                </TableCell>

                <TableCell className="text-slate-700">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    {DateUtils.formatDateTime(document.createdAt)}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(document.fileUrl, "_blank")}
                      className="hover:bg-indigo-100 hover:text-indigo-700"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = document.fileUrl;
                        link.download = document.fileName;
                        link.click();
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
</div>
  );
}

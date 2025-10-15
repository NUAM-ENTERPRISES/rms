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
      case "VERIFIED":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Verified
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const documents = documentsData?.data?.documents || [];

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Upload required documents for this candidate. Only PDF files are
            accepted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="docType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <span>{type.label}</span>
                                <Badge variant="outline" className="text-xs">
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

                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., A12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>File *</FormLabel>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {selectedFile.name} (
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Additional notes about this document"
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
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Documents
          </CardTitle>
          <CardDescription>
            All documents uploaded for this candidate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document: any) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">{document.fileName}</p>
                          {document.documentNumber && (
                            <p className="text-sm text-gray-500">
                              #{document.documentNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {DOCUMENT_TYPES.find(
                          (t) => t.value === document.docType
                        )?.label || document.docType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(document.status)}
                        {getStatusBadge(document.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {DateUtils.formatDateTime(document.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(document.fileUrl, "_blank")
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = document.fileUrl;
                            link.download = document.fileName;
                            link.click();
                          }}
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

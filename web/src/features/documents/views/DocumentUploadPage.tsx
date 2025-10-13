import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label as FormLabel } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  FileText,
  User,
  Calendar,
  Hash,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { useCreateDocumentMutation } from "@/features/documents";
import { useGetCandidatesQuery } from "@/features/candidates";
import { useCan } from "@/hooks/useCan";
import {
  getDocumentTypeConfig,
  DOCUMENT_TYPE,
} from "@/constants/document-types";
import { format } from "date-fns";

// ==================== VALIDATION SCHEMA ====================

const uploadDocumentSchema = z.object({
  candidateId: z.string().uuid("Please select a candidate"),
  docType: z.enum(Object.values(DOCUMENT_TYPE) as [string, ...string[]], {
    required_error: "Please select a document type",
  }),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid file URL"),
  fileSize: z.number().min(1, "File size must be greater than 0").optional(),
  mimeType: z.string().optional(),
  expiryDate: z.string().optional(),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
});

type UploadDocumentFormData = z.infer<typeof uploadDocumentSchema>;

// ==================== COMPONENT ====================

export default function DocumentUploadPage() {
  const navigate = useNavigate();
  const canWriteDocuments = useCan("write:documents");

  // API
  const [createDocument, { isLoading }] = useCreateDocumentMutation();
  const { data: candidatesData, isLoading: candidatesLoading } =
    useGetCandidatesQuery();

  // Local state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Candidates data
  const candidates = candidatesData || [];

  // Form
  const form = useForm<UploadDocumentFormData>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      candidateId: "",
      docType: "" as any,
      fileName: "",
      fileUrl: "",
      fileSize: 0,
      mimeType: "",
      expiryDate: "",
      documentNumber: "",
      notes: "",
    },
  });

  // Permission check
  if (!canWriteDocuments) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Access Denied
                </h2>
                <p className="text-muted-foreground">
                  You don't have permission to upload documents.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      form.setValue("fileName", file.name);
      form.setValue("fileSize", file.size);
      form.setValue("mimeType", file.type);

      // Simulate file upload to Digital Ocean Spaces
      // In real implementation, this would upload to DO Spaces
      const mockFileUrl = `https://spaces.digitalocean.com/documents/${Date.now()}-${
        file.name
      }`;
      form.setValue("fileUrl", mockFileUrl);
    }
  };

  const onSubmit = async (data: UploadDocumentFormData) => {
    try {
      await createDocument(data).unwrap();
      toast.success("Document uploaded successfully");
      navigate("/documents");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to upload document");
    }
  };

  const selectedDocType = form.watch("docType");
  const docTypeConfig = selectedDocType
    ? getDocumentTypeConfig(selectedDocType)
    : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Upload Document
              </h1>
              <p className="text-muted-foreground">
                Upload candidate documents for verification
              </p>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Document Information</span>
            </CardTitle>
            <CardDescription>
              Provide document details and upload the file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Candidate Selection */}
              <div className="space-y-2">
                <FormLabel
                  htmlFor="candidateId"
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>Candidate *</span>
                </FormLabel>
                <Select
                  value={form.watch("candidateId")}
                  onValueChange={(value) => form.setValue("candidateId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidatesLoading ? (
                      <SelectItem value="" disabled>
                        Loading candidates...
                      </SelectItem>
                    ) : (
                      candidates.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name} ({candidate.contact})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.candidateId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.candidateId.message}
                  </p>
                )}
              </div>

              {/* Document Type */}
              <div className="space-y-2">
                <FormLabel
                  htmlFor="docType"
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Document Type *</span>
                </FormLabel>
                <Select
                  value={form.watch("docType")}
                  onValueChange={(value) =>
                    form.setValue("docType", value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DOCUMENT_TYPE).map((docType) => {
                      const config = getDocumentTypeConfig(docType);
                      return (
                        <SelectItem key={docType} value={docType}>
                          <div className="flex items-center space-x-2">
                            <span>{config.icon}</span>
                            <span>{config.displayName}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {form.formState.errors.docType && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.docType.message}
                  </p>
                )}
                {docTypeConfig && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {docTypeConfig.description}
                    </p>
                    {docTypeConfig.hasExpiry && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ This document has an expiry date
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <FormLabel className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>File Upload *</span>
                </FormLabel>
                <div className="border-2 border-dashed border-border rounded-lg p-6">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    {selectedFile ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">{selectedFile.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-sm font-medium">Click to upload</p>
                          <p className="text-xs text-muted-foreground">
                            PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Document Number */}
              <div className="space-y-2">
                <FormLabel
                  htmlFor="documentNumber"
                  className="flex items-center space-x-2"
                >
                  <Hash className="h-4 w-4" />
                  <span>Document Number</span>
                </FormLabel>
                <Input
                  id="documentNumber"
                  placeholder="e.g., Passport number, License number"
                  {...form.register("documentNumber")}
                />
                {form.formState.errors.documentNumber && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.documentNumber.message}
                  </p>
                )}
              </div>

              {/* Expiry Date */}
              {docTypeConfig?.hasExpiry && (
                <div className="space-y-2">
                  <FormLabel
                    htmlFor="expiryDate"
                    className="flex items-center space-x-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Expiry Date</span>
                  </FormLabel>
                  <Input
                    id="expiryDate"
                    type="date"
                    {...form.register("expiryDate")}
                  />
                  {form.formState.errors.expiryDate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.expiryDate.message}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <FormLabel htmlFor="notes">Notes</FormLabel>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this document..."
                  rows={3}
                  {...form.register("notes")}
                />
                {form.formState.errors.notes && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.notes.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>Upload Document</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

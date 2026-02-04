-- CreateTable
CREATE TABLE "merged_documents" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleCatalogId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merged_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_forward_history" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleCatalogId" TEXT,
    "sendType" TEXT NOT NULL,
    "documentDetails" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "notes" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_forward_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merged_documents_candidateId_projectId_roleCatalogId_key" ON "merged_documents"("candidateId", "projectId", "roleCatalogId");

-- AddForeignKey
ALTER TABLE "merged_documents" ADD CONSTRAINT "merged_documents_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merged_documents" ADD CONSTRAINT "merged_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merged_documents" ADD CONSTRAINT "merged_documents_roleCatalogId_fkey" FOREIGN KEY ("roleCatalogId") REFERENCES "role_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_forward_history" ADD CONSTRAINT "document_forward_history_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_forward_history" ADD CONSTRAINT "document_forward_history_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_forward_history" ADD CONSTRAINT "document_forward_history_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_forward_history" ADD CONSTRAINT "document_forward_history_roleCatalogId_fkey" FOREIGN KEY ("roleCatalogId") REFERENCES "role_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "document_forward_history_senderId_idx" ON "document_forward_history"("senderId");

-- CreateIndex
CREATE INDEX "document_forward_history_candidateId_idx" ON "document_forward_history"("candidateId");

-- CreateIndex
CREATE INDEX "document_forward_history_projectId_idx" ON "document_forward_history"("projectId");

-- CreateIndex
CREATE INDEX "document_forward_history_roleCatalogId_idx" ON "document_forward_history"("roleCatalogId");

-- CreateIndex
CREATE INDEX "document_forward_history_status_idx" ON "document_forward_history"("status");

-- CreateIndex
CREATE INDEX "merged_documents_candidateId_idx" ON "merged_documents"("candidateId");

-- CreateIndex
CREATE INDEX "merged_documents_projectId_idx" ON "merged_documents"("projectId");

-- CreateIndex
CREATE INDEX "merged_documents_roleCatalogId_idx" ON "merged_documents"("roleCatalogId");

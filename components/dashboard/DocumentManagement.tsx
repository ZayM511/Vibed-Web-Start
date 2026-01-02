"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  File,
  GripVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Id } from "../../convex/_generated/dataModel";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type DocumentType = "resume" | "cover_letter" | "portfolio";

interface DocumentData {
  _id: Id<"documents">;
  fileName: string;
  fileSize: number;
  storageId: string;
  fileType: DocumentType;
  uploadedAt: number;
}

interface SortableDocumentItemProps {
  doc: DocumentData;
  onDelete: (id: Id<"documents">) => void;
  onDownload: (storageId: string, fileName: string) => void;
  onPreview: (doc: DocumentData) => void;
  formatFileSize: (bytes: number) => string;
}

function SortableDocumentItem({ doc, onDelete, onDownload, onPreview, formatFileSize }: SortableDocumentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded transition-colors"
      >
        <GripVertical className="h-5 w-5 text-white/40" />
      </div>

      {/* File Icon */}
      <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg">
        <FileText className="h-5 w-5 text-indigo-400" />
      </div>

      {/* File Info - Clickable for preview */}
      <div
        className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onPreview(doc)}
      >
        <p className="text-white font-medium truncate">
          {doc.fileName}
        </p>
        <p className="text-white/50 text-sm">
          {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDownload(doc.storageId, doc.fileName)}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(doc._id)}
          className="text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export function DocumentManagement() {
  const [activeDocType, setActiveDocType] = useState<DocumentType>("resume");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentsByType = useQuery(api.documents.getDocumentsByType, { fileType: activeDocType });
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.createDocument);
  const deleteDocument = useMutation(api.documents.deleteDocument);
  const reorderDocuments = useMutation(api.documents.reorderDocuments);

  // Get document URL for preview
  const docUrl = useQuery(
    api.documents.getDocumentUrl,
    previewDoc ? { storageId: previewDoc.storageId } : "skip"
  );

  // Update preview URL when docUrl changes
  useEffect(() => {
    if (docUrl) {
      setPreviewUrl(docUrl);
    }
  }, [docUrl]);

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!validateFileType(file, activeDocType)) {
      alert(`Invalid file type for ${getDocumentTypeName(activeDocType)}. ${getFileTypeDescription(activeDocType)}`);
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Get a short-lived upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: POST the file to the URL
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      const { storageId } = await result.json();

      // Step 3: Save the file metadata to the database
      await createDocument({
        storageId,
        fileName: file.name,
        fileSize: file.size,
        fileFormat: file.type || "application/octet-stream",
        fileType: activeDocType,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: Id<"documents">) => {
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteDocument({ documentId });
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete document. Please try again.");
      }
    }
  };

  const handleDownload = async (storageId: string, fileName: string) => {
    try {
      // Get the URL from Convex storage
      const url = await fetch(`/api/documents/download?storageId=${storageId}`);
      if (url.ok) {
        const blob = await url.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file. Please try again.");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !documentsByType) return;

    if (active.id !== over.id) {
      const oldIndex = documentsByType.findIndex((doc) => doc._id === active.id);
      const newIndex = documentsByType.findIndex((doc) => doc._id === over.id);

      const newOrder = arrayMove(documentsByType, oldIndex, newIndex);
      const documentIds = newOrder.map((doc) => doc._id);

      // Update the order in the database
      try {
        await reorderDocuments({
          documentIds,
          fileType: activeDocType,
        });
      } catch (error) {
        console.error("Reorder error:", error);
        alert("Failed to reorder documents. Please try again.");
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePreview = (doc: any) => {
    setPreviewDoc(doc);
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.toLowerCase().split('.').pop() || '';

    // PDF files
    if (extension === 'pdf') return 'pdf';

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return 'image';

    // Text files
    if (['txt', 'md', 'csv'].includes(extension)) return 'text';

    // Document files (Word, etc.)
    if (['doc', 'docx'].includes(extension)) return 'document';

    // Default
    return 'other';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getDocumentTypeName = (type: DocumentType) => {
    switch (type) {
      case "resume": return "Resume / CV";
      case "cover_letter": return "Cover Letter";
      case "portfolio": return "Portfolio";
    }
  };

  const getAcceptedFileTypes = (type: DocumentType) => {
    switch (type) {
      case "resume":
      case "cover_letter":
        return ".pdf,.doc,.docx,.txt";
      case "portfolio":
        return undefined; // Accept all file types
    }
  };

  const getFileTypeDescription = (type: DocumentType) => {
    switch (type) {
      case "resume":
      case "cover_letter":
        return "Supported formats: PDF, DOC, DOCX, TXT";
      case "portfolio":
        return "All file formats supported";
    }
  };

  const validateFileType = (file: File, type: DocumentType): boolean => {
    if (type === "portfolio") return true; // Portfolio accepts all files

    const fileName = file.name.toLowerCase();
    const validExtensions = [".pdf", ".doc", ".docx", ".txt"];

    return validExtensions.some(ext => fileName.endsWith(ext));
  };

  return (
    <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Document Management</CardTitle>
        <CardDescription className="text-white/60">
          Upload and manage your job application documents. Drag files to reorder them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Document Type Tabs */}
        <Tabs value={activeDocType} onValueChange={(value) => setActiveDocType(value as DocumentType)}>
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10 mb-6">
            <TabsTrigger
              value="resume"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Resume / CV
            </TabsTrigger>
            <TabsTrigger
              value="cover_letter"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Cover Letter
            </TabsTrigger>
            <TabsTrigger
              value="portfolio"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Portfolio
            </TabsTrigger>
          </TabsList>

          {/* Upload Area */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative mb-6 border-2 border-dashed rounded-lg p-8 transition-all ${
              isDragging
                ? "border-indigo-400 bg-indigo-500/10"
                : "border-white/20 bg-white/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptedFileTypes(activeDocType)}
              onChange={handleFileSelect}
              className="hidden"
            />

            {isUploading ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
                <p className="text-white/80 font-medium">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full">
                  <Upload className="h-8 w-8 text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium mb-1">
                    Drag and drop your {getDocumentTypeName(activeDocType).toLowerCase()} here
                  </p>
                  <p className="text-white/50 text-sm mb-4">
                    or click to browse files
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <p className="text-white/40 text-xs">
                  {getFileTypeDescription(activeDocType)}
                </p>
              </div>
            )}
          </div>

          {/* Document List */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">
                Your {getDocumentTypeName(activeDocType)}{activeDocType !== "portfolio" && "s"}
              </h3>
              <p className="text-xs text-white/40 mt-1">Click for preview</p>
            </div>

            {documentsByType === undefined ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
              </div>
            ) : documentsByType.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <File className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No {getDocumentTypeName(activeDocType).toLowerCase()}s uploaded yet</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={documentsByType.map((doc) => doc._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    <AnimatePresence>
                      {documentsByType.map((doc) => (
                        <SortableDocumentItem
                          key={doc._id}
                          doc={doc}
                          onDelete={handleDelete}
                          onDownload={handleDownload}
                          onPreview={handlePreview}
                          formatFileSize={formatFileSize}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </Tabs>
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{previewDoc?.fileName}</DialogTitle>
            <DialogDescription className="text-white/60">
              {previewDoc && formatFileSize(previewDoc.fileSize)} • {previewDoc && new Date(previewDoc.uploadedAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 overflow-auto max-h-[70vh]">
            {previewDoc && previewUrl && (() => {
              const fileType = getFileType(previewDoc.fileName);

              // PDF Preview
              if (fileType === 'pdf') {
                return (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[600px] border border-white/10 rounded-lg"
                    title={previewDoc.fileName}
                  />
                );
              }

              // Image Preview
              if (fileType === 'image') {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={previewDoc.fileName}
                    className="w-full h-auto max-h-[600px] object-contain border border-white/10 rounded-lg"
                  />
                );
              }

              // Text file preview
              if (fileType === 'text') {
                return (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[600px] border border-white/10 rounded-lg bg-white/5"
                    title={previewDoc.fileName}
                  />
                );
              }

              // Document files (Word, etc.) - No direct preview available
              if (fileType === 'document') {
                return (
                  <div className="flex flex-col items-center justify-center p-12 border border-white/10 rounded-lg bg-white/5">
                    <FileText className="h-16 w-16 text-white/40 mb-4" />
                    <p className="text-white/80 text-center mb-2">
                      Preview not available for this file type
                    </p>
                    <p className="text-white/50 text-sm text-center mb-6">
                      Word documents cannot be previewed in the browser
                    </p>
                    <Button
                      onClick={() => handleDownload(previewDoc.storageId, previewDoc.fileName)}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                );
              }

              // Other file types
              return (
                <div className="flex flex-col items-center justify-center p-12 border border-white/10 rounded-lg bg-white/5">
                  <File className="h-16 w-16 text-white/40 mb-4" />
                  <p className="text-white/80 text-center mb-2">
                    Preview not available for this file type
                  </p>
                  <p className="text-white/50 text-sm text-center mb-6">
                    {previewDoc.fileName.split('.').pop()?.toUpperCase()} files cannot be previewed in the browser
                  </p>
                  <Button
                    onClick={() => handleDownload(previewDoc.storageId, previewDoc.fileName)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

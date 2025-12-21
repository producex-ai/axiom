"use client";

import { FileText, Image, Loader2, Upload, X } from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  deleteInvoiceDocument,
  type UploadActionState,
  uploadInvoiceDocument,
} from "@/actions/storage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export type UploadedInvoiceInfo = {
  path: string;
  name?: string;
  mimeType?: string;
  signedUrl?: string | null;
};

interface InvoiceUploadProps {
  onUploadSuccess: (file: UploadedInvoiceInfo | null) => void;
  onUploadError: (error: string) => void;
  required?: boolean;
  lotNumber?: string;
  translations: {
    label: string;
    placeholder: string;
    dragDropText: string;
    uploadButton: string;
    uploading: string;
    removeButton: string;
    fileTypes: string;
  };
}

export function InvoiceUpload({
  onUploadSuccess,
  onUploadError,
  required = true,
  lotNumber,
  translations,
}: InvoiceUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    path: string;
    type: string;
    signedUrl?: string | null;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialState: UploadActionState = {};
  const [uploadState, uploadAction] = useActionState(
    uploadInvoiceDocument,
    initialState,
  );

  // Handle successful upload
  useEffect(() => {
    if (uploadState.success && uploadState.path) {
      const fileInput = fileInputRef.current;
      const fileName = fileInput?.files?.[0]?.name || "invoice-document";
      const fileType = fileInput?.files?.[0]?.type || "";

      setUploadedFile({
        name: fileName,
        path: uploadState.path,
        type: fileType,
        signedUrl: uploadState.signedUrl,
      });
      onUploadSuccess({
        path: uploadState.path,
        name: fileName,
        mimeType: fileType,
        signedUrl: uploadState.signedUrl,
      });

      // Reset the form input after successful upload (but keep the uploadedFile state)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else if (uploadState.success && !uploadState.path) {
      console.error("Upload succeeded but no storage path was returned.");
      onUploadError("Unable to determine storage path for uploaded file.");
    }
  }, [uploadState, onUploadSuccess, onUploadError]);

  // Handle upload error
  useEffect(() => {
    if (uploadState.message && !uploadState.success) {
      onUploadError(uploadState.message);
    }
  }, [uploadState.message, uploadState.success, onUploadError]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    onUploadError("");

    const formData = new FormData();
    formData.append("invoiceDocument", file);
    if (lotNumber) {
      formData.append("lotNumber", lotNumber);
    }

    startTransition(() => {
      uploadAction(formData);
    });
  };

  const resetUploadState = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onUploadSuccess(null);
    onUploadError(""); // Clear any upload errors
  };

  const handleRemoveFile = async () => {
    if (!uploadedFile?.path) return;

    setIsDeleting(true);
    try {
      const result = await deleteInvoiceDocument(uploadedFile.path);
      if (result.success) {
        console.log("File deleted successfully");
        resetUploadState();
        return;
      } else {
        onUploadError(result.message);
      }
    } catch {
      onUploadError("Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-red-500" />;
  };

  return (
    <div className="space-y-2">
      <Label className="font-medium text-gray-700 text-sm">
        {translations.label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>

      {!uploadedFile ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            name="invoiceDocument"
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isPending}
          />

          <Button
            type="button"
            variant="outline"
            onClick={openFileDialog}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className={`mr-2 h-4 w-4`} />
            )}
            {isPending ? translations.uploading : translations.uploadButton}
          </Button>

          <p className="text-center text-gray-500 text-xs">
            {translations.fileTypes}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon(uploadedFile.type)}
              <div className="flex-1">
                <p className="max-w-[200px] truncate font-medium text-gray-900 text-sm">
                  {uploadedFile.name}
                </p>
                <p className="text-green-600 text-xs">
                  ✓ Uploaded successfully
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={isPending || isDeleting}
            >
              {isDeleting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {uploadState.errors?.invoiceDocument && (
        <p className="text-red-600 text-xs">
          {uploadState.errors.invoiceDocument[0]}
        </p>
      )}
    </div>
  );
}

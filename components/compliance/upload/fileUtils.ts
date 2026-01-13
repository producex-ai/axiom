import { toast } from "sonner";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const validateFile = (file: File): string | null => {
  const validMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!validMimeTypes.includes(file.type)) {
    return "Only DOCX files are allowed";
  }

  const ext = file.name.toLowerCase().split(".").pop();
  if (ext !== "docx") {
    return "File must have .docx extension";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "File size must be less than 10MB";
  }

  return null;
};

export const validateFileCount = (
  selectedCount: number,
  newCount: number,
): string | null => {
  if (selectedCount + newCount > MAX_FILES) {
    return `Maximum ${MAX_FILES} files allowed. You selected ${
      selectedCount + newCount
    }`;
  }
  return null;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export const simulateUploadProgress = (
  onProgress: (progress: number) => void,
): NodeJS.Timer => {
  let progress = 0;
  const timer = setInterval(() => {
    progress += Math.random() * 25;
    if (progress >= 90) {
      progress = 90;
      clearInterval(timer);
    }
    onProgress(progress);
  }, 200);
  return timer;
};

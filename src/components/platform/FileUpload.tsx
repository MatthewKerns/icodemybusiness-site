"use client";

import * as React from "react";
import { Upload, X, File, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FileUploadProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrop"> {
  onFilesSelected?: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedFileTypes?: string[];
  files?: File[];
  disabled?: boolean;
  error?: string;
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      className,
      onFilesSelected,
      onFileRemove,
      maxFiles = 10,
      maxSize = 10 * 1024 * 1024, // 10MB default
      acceptedFileTypes,
      files = [],
      disabled = false,
      error,
      ...props
    },
    ref
  ) => {
    const [isDragActive, setIsDragActive] = React.useState(false);
    const [internalError, setInternalError] = React.useState<string>("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    const displayError = error || internalError;

    const validateFiles = (filesToValidate: File[]): { valid: File[]; error?: string } => {
      // Check max files
      if (files.length + filesToValidate.length > maxFiles) {
        return {
          valid: [],
          error: `Maximum ${maxFiles} file${maxFiles > 1 ? "s" : ""} allowed`,
        };
      }

      // Check file size and type
      const validFiles: File[] = [];
      for (const file of filesToValidate) {
        if (file.size > maxSize) {
          return {
            valid: [],
            error: `File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`,
          };
        }

        if (acceptedFileTypes && acceptedFileTypes.length > 0) {
          const fileType = file.type || "";
          const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";

          const isAccepted = acceptedFileTypes.some((type) => {
            if (type.includes("*")) {
              // Handle wildcards like "image/*"
              const baseType = type.split("/")[0];
              return fileType.startsWith(baseType);
            }
            // Handle exact types or extensions
            return fileType === type || `.${fileExtension}` === type;
          });

          if (!isAccepted) {
            return {
              valid: [],
              error: `File type "${fileExtension}" not accepted. Allowed types: ${acceptedFileTypes.join(", ")}`,
            };
          }
        }

        validFiles.push(file);
      }

      return { valid: validFiles };
    };

    const handleFiles = (newFiles: File[]) => {
      setInternalError("");

      const { valid, error: validationError } = validateFiles(newFiles);

      if (validationError) {
        setInternalError(validationError);
        return;
      }

      if (valid.length > 0 && onFilesSelected) {
        onFilesSelected(valid);
      }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragActive(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
      handleFiles(selectedFiles);

      // Reset input value to allow selecting the same file again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    const handleClick = () => {
      if (!disabled) {
        inputRef.current?.click();
      }
    };

    const handleRemoveFile = (index: number) => {
      if (onFileRemove) {
        onFileRemove(index);
      }
      setInternalError("");
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
    };

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
            isDragActive && !disabled
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/50",
            disabled && "cursor-not-allowed opacity-50 hover:border-border hover:bg-transparent",
            displayError && "border-destructive"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple={maxFiles > 1}
            accept={acceptedFileTypes?.join(",")}
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
            aria-label="File upload input"
          />

          <Upload
            className={cn(
              "mb-4 h-10 w-10",
              isDragActive && !disabled ? "text-primary" : "text-muted-foreground"
            )}
          />

          <div className="text-center">
            <p className="mb-1 text-sm font-medium text-foreground">
              {isDragActive && !disabled ? (
                "Drop files here"
              ) : (
                <>
                  <span className="text-primary">Click to upload</span> or drag and drop
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {acceptedFileTypes && acceptedFileTypes.length > 0
                ? `Accepted types: ${acceptedFileTypes.join(", ")}`
                : "Any file type"}
              {" • "}
              Max {formatFileSize(maxSize)}
              {maxFiles > 1 && ` • Up to ${maxFiles} files`}
            </p>
          </div>
        </div>

        {displayError && (
          <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{displayError}</span>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-md border border-border bg-accent/50 p-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <File className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  disabled={disabled}
                  className="flex-shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

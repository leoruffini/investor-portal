"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFilesSelected, disabled }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "application/pdf"
      );
      if (files.length > 0) onFilesSelected(files);
    },
    [onFilesSelected, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) onFilesSelected(files);
      e.target.value = "";
    },
    [onFilesSelected]
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 sm:p-12 transition-colors cursor-pointer",
        dragging ? "border-teal bg-teal/5" : "border-border hover:border-teal/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <svg
        className="h-10 w-10 text-muted-foreground mb-3"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="text-sm font-medium text-navy">
        Arrastre sus archivos PDF aquí
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        o haga clic para seleccionar
      </p>
      <input
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </label>
  );
}

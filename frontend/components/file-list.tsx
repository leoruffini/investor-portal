"use client";

import { Badge } from "@/components/ui/badge";

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <ul className="space-y-2 mt-4">
      {files.map((file, i) => (
        <li
          key={`${file.name}-${i}`}
          className="flex items-center justify-between rounded-md border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <svg
              className="h-5 w-5 shrink-0 text-teal"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <span className="text-sm truncate">{file.name}</span>
            <Badge variant="secondary" className="text-xs">
              {(file.size / 1024).toFixed(0)} KB
            </Badge>
          </div>
          <button
            onClick={() => onRemove(i)}
            className="text-muted-foreground hover:text-destructive ml-2"
            aria-label="Eliminar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvestor } from "@/context/investor-context";
import { StepIndicator } from "@/components/step-indicator";
import { FileDropzone } from "@/components/file-dropzone";
import { FileList } from "@/components/file-list";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadDocs } from "@/lib/api";

export default function UploadPage() {
  const { investor, loading, error: ctxError, refresh } = useInvestor();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal border-t-transparent" />
      </div>
    );
  }

  if (ctxError || !investor) {
    return (
      <div className="py-20 text-center">
        <p className="text-destructive">{ctxError || "Inversor no encontrado"}</p>
      </div>
    );
  }

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Seleccione al menos un archivo PDF.");
      return;
    }
    try {
      setUploading(true);
      setError(null);
      await uploadDocs(investor.id, files);
      await refresh();
      router.push(`/portal/${params.token}/review`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al subir los documentos"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <StepIndicator currentStep="upload" />

      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-navy">
            Subir documentos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suba los documentos corporativos de{" "}
            <span className="font-medium text-navy">{investor.name}</span>:
            escritura de constitución, nombramiento de cargos y poderes de
            representación.
          </p>
        </div>

        <FileDropzone
          onFilesSelected={handleFilesSelected}
          disabled={uploading}
        />

        <FileList files={files} onRemove={handleRemove} />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="bg-navy hover:bg-navy/90"
          >
            {uploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Procesando...
              </>
            ) : (
              "Subir y procesar"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

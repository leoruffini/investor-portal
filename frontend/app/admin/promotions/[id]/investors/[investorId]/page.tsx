"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import {
  getInvestor,
  getKycData,
  getDocuments,
  downloadDocument,
  uploadDocs,
  confirmKycData,
  generateProtocol,
} from "@/lib/api";
import { Investor, KycData, Document } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { CopyLinkButton } from "@/components/copy-link-button";
import { FileDropzone } from "@/components/file-dropzone";
import { FileList } from "@/components/file-list";
import { KycReviewForm, KycReviewFormHandle } from "@/components/kyc-review-form";

export default function InvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string; investorId: string }>;
}) {
  const { id: promotionId, investorId } = use(params);

  const [investor, setInvestor] = useState<Investor | null>(null);
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // KYC confirm state
  const [confirming, setConfirming] = useState(false);
  const kycFormRef = useRef<KycReviewFormHandle>(null);

  // Protocol state
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    try {
      const [inv, kyc, docs] = await Promise.all([
        getInvestor(investorId),
        getKycData(investorId),
        getDocuments(investorId),
      ]);
      setInvestor(inv);
      setKycData(kyc);
      setDocuments(docs);
    } catch (err) {
      console.error("Error loading investor:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investorId]);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadError("");

    try {
      const result = await uploadDocs(investorId, files);
      setKycData(result);
      setFiles([]);
      await load();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Error al subir documentos"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    const data = kycFormRef.current?.getData();
    setConfirming(true);
    try {
      const result = await confirmKycData(investorId, data);
      setKycData(result);
      await load();
    } catch (err) {
      console.error("Error confirming:", err);
      alert("Error al confirmar los datos");
    } finally {
      setConfirming(false);
    }
  };

  const handleGenerateProtocol = async () => {
    setGenerating(true);
    try {
      const blob = await generateProtocol(investorId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `protocolo_${investor?.name.replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      await load();
    } catch (err) {
      console.error("Error generating protocol:", err);
      alert("Error al generar el protocolo");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!investor) {
    return <p className="text-muted-foreground">Inversor no encontrado.</p>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href={`/admin/promotions/${promotionId}`}
          className="text-sm text-muted-foreground hover:text-navy transition-colors"
        >
          ← Volver a la promoción
        </Link>
      </div>

      {/* Investor info card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{investor.name}</CardTitle>
            <StatusBadge status={investor.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="mt-0.5 text-sm text-navy">{investor.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Inversión</p>
              <p className="mt-0.5 text-sm text-navy">
                {investor.investment_amount
                  ? `${investor.investment_amount.toLocaleString("es-ES")} €`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Participación</p>
              <p className="mt-0.5 text-sm text-navy">
                {investor.ownership_pct != null ? `${investor.ownership_pct}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Enlace portal</p>
              <div className="mt-0.5">
                <CopyLinkButton token={investor.token} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length > 0 && (
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-navy">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.doc_type.replace(/_/g, " ")} · {new Date(doc.uploaded_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadDocument(investorId, doc.id, doc.filename)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-teal hover:text-teal"
                  >
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload on behalf */}
          {(investor.status === "pending" || investor.status === "docs_uploaded") && (
            <div>
              <p className="mb-2 text-sm font-medium text-navy">
                Subir documentos en nombre del inversor
              </p>
              <FileDropzone
                onFilesSelected={(newFiles) =>
                  setFiles((prev) => [...prev, ...newFiles])
                }
                disabled={uploading}
              />
              {files.length > 0 && (
                <>
                  <div className="mt-3">
                    <FileList
                      files={files}
                      onRemove={(i) =>
                        setFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    />
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="mt-3 bg-navy hover:bg-navy/90"
                  >
                    {uploading ? "Procesando..." : "Procesar documentos"}
                  </Button>
                </>
              )}
              {uploadError && (
                <p className="mt-2 text-sm text-destructive">{uploadError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC Data section */}
      {kycData && kycData.extracted_json && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Datos extraídos (KYC)</CardTitle>
              {kycData.confirmed && kycData.confirmed_at && (
                <span className="text-xs text-muted-foreground">
                  Confirmado el{" "}
                  {new Date(kycData.confirmed_at).toLocaleDateString("es-ES")}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <KycReviewForm
              ref={kycFormRef}
              data={kycData.extracted_json}
            />
            {!kycData.confirmed && (
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="bg-navy hover:bg-navy/90"
              >
                {confirming
                  ? "Confirmando..."
                  : "Confirmar datos en nombre del inversor"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Protocol section */}
      {(investor.status === "data_confirmed" || investor.status === "complete") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Protocolo de inversión</CardTitle>
          </CardHeader>
          <CardContent>
            {investor.status === "complete" ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Protocolo generado correctamente.
                </div>
                <Button
                  onClick={handleGenerateProtocol}
                  disabled={generating}
                  variant="outline"
                  className="border-teal text-teal hover:bg-teal/5"
                >
                  {generating ? "Descargando..." : "Descargar protocolo (.docx)"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleGenerateProtocol}
                disabled={generating}
                className="border-teal text-teal hover:bg-teal/5"
                variant="outline"
              >
                {generating ? "Generando..." : "Generar protocolo (.docx)"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

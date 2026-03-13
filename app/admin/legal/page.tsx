"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

type TemplateInfo = { exists: boolean; fileName?: string; uploadedAt?: string };

export default function LegalTemplatesPage() {
  const { ready } = useAuth();
  const [info, setInfo] = useState<TemplateInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await fetch("/api/admin/nda");
    const d = await res.json();
    setInfo(d);
  };

  useEffect(() => { if (ready) load(); }, [ready]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) { setError("Only .docx files are accepted"); return; }
    setError(""); setSuccess(""); setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data URL prefix
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/admin/nda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, base64 }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Upload failed"); return; }
      setSuccess("Template uploaded successfully.");
      await load();
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Upload failed — please try again");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove the NDA template? You will need to re-upload one to send NDAs.")) return;
    setDeleting(true);
    await fetch("/api/admin/nda", { method: "DELETE" });
    setInfo({ exists: false });
    setDeleting(false);
    setSuccess("Template removed.");
  };

  if (!ready) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-sm text-oj-muted hover:text-oj-dark">← Control Centre</Link>
        <span className="text-oj-muted">/</span>
        <span className="text-sm font-semibold text-oj-dark">Legal Templates</span>
      </div>

      <h1 className="text-2xl font-bold text-oj-dark mb-1">Legal Templates</h1>
      <p className="text-sm text-oj-muted mb-8">
        Upload the NDA Word template. Use <code className="bg-oj-bg px-1.5 py-0.5 rounded text-xs">{"{clientName}"}</code>,{" "}
        <code className="bg-oj-bg px-1.5 py-0.5 rounded text-xs">{"{regNumber}"}</code>, and{" "}
        <code className="bg-oj-bg px-1.5 py-0.5 rounded text-xs">{"{address}"}</code> as placeholders in your Word doc.
      </p>

      {/* NDA Template card */}
      <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-oj-bg border-b border-oj-border">
          <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">NDA Template</span>
        </div>
        <div className="px-5 py-5">
          {info === null ? (
            <p className="text-sm text-oj-muted">Loading…</p>
          ) : info.exists ? (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
                <span>✓</span>
                <span>{info.fileName}</span>
              </div>
              <span className="text-xs text-oj-muted">
                Uploaded {info.uploadedAt ? new Date(info.uploadedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : ""}
              </span>
              <div className="flex gap-2 ml-auto">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-blue text-white text-xs font-semibold hover:bg-oj-blue-hover transition-colors cursor-pointer">
                  {uploading ? "Uploading…" : "↑ Replace"}
                  <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-oj-muted">No NDA template uploaded yet.</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors cursor-pointer">
                {uploading ? (
                  <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Uploading…</>
                ) : (
                  <>↑ Upload NDA Template (.docx)</>
                )}
                <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          )}

          {error && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>
          )}
        </div>

        {/* Placeholder guide */}
        <div className="px-5 py-4 bg-oj-bg border-t border-oj-border">
          <p className="text-xs font-semibold text-oj-muted mb-2 uppercase tracking-wide">Placeholder reference</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-oj-muted">
                <th className="text-left pb-1 font-semibold">Placeholder in Word doc</th>
                <th className="text-left pb-1 font-semibold">Filled from</th>
              </tr>
            </thead>
            <tbody className="text-oj-dark">
              <tr><td className="py-0.5 font-mono">{"{clientName}"}</td><td className="py-0.5 text-oj-muted">Cognito — Company Name</td></tr>
              <tr><td className="py-0.5 font-mono">{"{regNumber}"}</td><td className="py-0.5 text-oj-muted">Cognito — Company Registration Number</td></tr>
              <tr><td className="py-0.5 font-mono">{"{address}"}</td><td className="py-0.5 text-oj-muted">Cognito — Physical Address</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

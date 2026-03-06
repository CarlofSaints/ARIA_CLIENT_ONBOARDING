"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/useAuth";

type CAM = { id: string; name: string; surname: string; email: string; cell: string };
type Channel = { id: string; name: string };

const emptyForm = {
  name: "",
  camId: "",
  channelIds: [] as string[],
  startDate: "",
  contactName: "",
  website: "",
  emails: [""],
  logoBase64: undefined as string | undefined,
  logoName: "",
};

export default function NewOnboardingPage() {
  const { ready } = useAuth();
  const [cams, setCams] = useState<CAM[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    fetch("/api/cams").then((r) => r.json()).then(setCams);
    fetch("/api/channels").then((r) => r.json()).then(setChannels);
  }, [ready]);

  const toggleChannel = (id: string) => {
    setForm((f) => ({
      ...f,
      channelIds: f.channelIds.includes(id)
        ? f.channelIds.filter((c) => c !== id)
        : [...f.channelIds, id],
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        logoBase64: reader.result as string,
        logoName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const setEmail = (idx: number, val: string) => {
    setForm((f) => {
      const emails = [...f.emails];
      emails[idx] = val;
      return { ...f, emails };
    });
  };

  const addEmail = () => setForm((f) => ({ ...f, emails: [...f.emails, ""] }));

  const removeEmail = (idx: number) => {
    setForm((f) => ({ ...f, emails: f.emails.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.channelIds.length === 0) return;
    const validEmails = form.emails.filter((em) => em.trim());
    if (validEmails.length === 0) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          logoBase64: form.logoBase64,
          website: form.website,
          camId: form.camId,
          emails: validEmails,
          startDate: form.startDate,
          channelIds: form.channelIds,
          contactName: form.contactName,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSubmitError(d.error ?? "Submission failed");
        return;
      }
      const data = await res.json();
      setCreatedClientId(data.id ?? null);
      setSuccess(true);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 text-3xl">
          ✅
        </div>
        <h2 className="text-2xl font-bold text-oj-blue mb-2">Client Created</h2>
        <p className="text-oj-muted mb-3">
          The client record has been saved and a welcome email has been sent.
        </p>
        <p className="text-sm text-oj-muted mb-8">
          Next step: set up the SharePoint folder and Teams structure for this client.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {createdClientId && (
            <Link
              href={`/clients/${createdClientId}`}
              className="bg-oj-blue text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-oj-blue-hover transition-colors"
            >
              Set Up SharePoint &amp; Teams →
            </Link>
          )}
          <button
            onClick={() => { setSuccess(false); setForm(emptyForm); setCreatedClientId(null); }}
            className="border border-oj-border px-6 py-2.5 rounded-lg text-sm text-oj-dark hover:bg-oj-bg transition-colors"
          >
            Create Another Client
          </button>
          <Link
            href="/"
            className="border border-oj-border px-6 py-2.5 rounded-lg text-sm text-oj-dark hover:bg-oj-bg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const selectedCam = cams.find((c) => c.id === form.camId);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-oj-muted mb-6">
        <Link href="/" className="hover:text-oj-blue">Dashboard</Link>
        <span>/</span>
        <span className="text-oj-dark font-medium">New Client</span>
      </div>

      <div className="mb-8">
        <div className="text-xs font-bold text-oj-orange tracking-wider mb-1">PHASE 01</div>
        <h1 className="text-2xl font-bold text-oj-blue mb-1">Create Client</h1>
        <p className="text-sm text-oj-muted">Complete this form to initiate a new ARIA client onboarding.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-oj-white border border-oj-border rounded-xl p-8 space-y-6 shadow-sm">

        {/* Client Name */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Client Name <span className="text-oj-orange">*</span>
          </label>
          <input
            type="text" required placeholder="e.g. ACME Retail (Pty) Ltd"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
        </div>

        {/* Client Logo */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">Client Logo (optional)</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border border-oj-border rounded-lg px-4 py-2.5 text-sm text-oj-dark hover:border-oj-blue hover:bg-oj-blue-light/30 transition-colors"
            >
              {form.logoBase64 ? "Change Logo" : "Upload Logo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            {form.logoBase64 ? (
              <div className="flex items-center gap-3">
                <Image src={form.logoBase64} alt="Client logo preview" width={48} height={48} className="h-10 w-auto object-contain rounded border border-oj-border" />
                <span className="text-xs text-oj-muted">{form.logoName}</span>
                <button type="button" onClick={() => setForm((f) => ({ ...f, logoBase64: undefined, logoName: "" }))}
                  className="text-xs text-oj-orange hover:text-oj-orange-hover">
                  Remove
                </button>
              </div>
            ) : (
              <span className="text-xs text-oj-muted">PNG, JPG, SVG — will be included in the welcome email</span>
            )}
          </div>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">Website (optional)</label>
          <input
            type="url" placeholder="https://www.client.co.za"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
        </div>

        {/* Assign CAM */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Assign CAM <span className="text-oj-orange">*</span>
          </label>
          <select
            required value={form.camId}
            onChange={(e) => setForm((f) => ({ ...f, camId: e.target.value }))}
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue bg-white text-oj-dark"
          >
            <option value="">Select a CAM...</option>
            {cams.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.surname}</option>
            ))}
          </select>
          {selectedCam && (
            <p className="text-xs text-oj-muted mt-1.5">{selectedCam.email}</p>
          )}
          {cams.length === 0 && (
            <p className="text-xs text-oj-muted mt-1.5">
              No CAMs configured.{" "}
              <Link href="/admin/cams" className="text-oj-blue underline">Add CAMs in the Control Centre.</Link>
            </p>
          )}
        </div>

        {/* Channels */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Channels <span className="text-oj-orange">*</span>
          </label>
          {channels.length === 0 ? (
            <p className="text-xs text-oj-muted">
              No channels configured.{" "}
              <Link href="/admin/channels" className="text-oj-blue underline">Add channels in the Control Centre.</Link>
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {channels.map((ch) => (
                <label
                  key={ch.id}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors text-sm select-none ${
                    form.channelIds.includes(ch.id)
                      ? "border-oj-blue bg-oj-blue-light text-oj-blue font-medium"
                      : "border-oj-border text-oj-dark hover:border-oj-blue hover:bg-oj-blue-light/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.channelIds.includes(ch.id)}
                    onChange={() => toggleChannel(ch.id)}
                    className="accent-oj-blue"
                  />
                  {ch.name}
                </label>
              ))}
            </div>
          )}
          {form.channelIds.length === 0 && channels.length > 0 && (
            <p className="text-xs text-oj-muted mt-1.5">Please select at least one channel.</p>
          )}
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Client Start Date <span className="text-oj-orange">*</span>
          </label>
          <input
            type="date" required value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
          />
        </div>

        {/* Contact Name */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Client Contact Name <span className="text-oj-orange">*</span>
          </label>
          <input
            type="text" required placeholder="Full name of primary contact"
            value={form.contactName}
            onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
        </div>

        {/* Welcome Email Recipients */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Welcome Email Recipients <span className="text-oj-orange">*</span>
          </label>
          <div className="space-y-2">
            {form.emails.map((em, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="email"
                  required={idx === 0}
                  placeholder={idx === 0 ? "primary@client.com" : "additional@client.com"}
                  value={em}
                  onChange={(e) => setEmail(idx, e.target.value)}
                  className="flex-1 border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
                />
                {form.emails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmail(idx)}
                    className="text-oj-muted hover:text-oj-orange text-sm px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addEmail}
            className="mt-2 text-sm text-oj-blue hover:text-oj-blue-hover font-medium"
          >
            + Add another recipient
          </button>
        </div>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {submitError}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || form.channelIds.length === 0}
            className="flex-1 bg-oj-blue text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-oj-blue-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating Client…" : "Create Client"}
          </button>
          <button
            type="button"
            disabled
            title="Cognito integration coming in a future phase"
            className="px-5 py-2.5 border border-oj-border rounded-lg text-sm text-oj-muted cursor-not-allowed bg-oj-bg"
          >
            Load from Cognito
          </button>
        </div>
      </form>
    </div>
  );
}

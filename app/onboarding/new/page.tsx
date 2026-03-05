"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CAM = { id: string; name: string; email: string };
type Channel = { id: string; name: string };

const emptyForm = {
  camId: "",
  channelIds: [] as string[],
  startDate: "",
  clientName: "",
  contactName: "",
  contactEmail: "",
};

export default function NewOnboardingPage() {
  const [cams, setCams] = useState<CAM[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/cams").then((r) => r.json()).then(setCams);
    fetch("/api/channels").then((r) => r.json()).then(setChannels);
  }, []);

  const toggleChannel = (id: string) => {
    setForm((f) => ({
      ...f,
      channelIds: f.channelIds.includes(id)
        ? f.channelIds.filter((c) => c !== id)
        : [...f.channelIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.channelIds.length === 0) return;
    setSubmitting(true);
    // Phase 1: simulate success — persistence will be added in a later phase
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-oj-blue-light flex items-center justify-center mx-auto mb-5 text-3xl">
          ✅
        </div>
        <h2 className="text-2xl font-bold text-oj-blue mb-2">
          Onboarding Initiated
        </h2>
        <p className="text-oj-muted mb-8">
          Client intake has been recorded. Next steps will be assigned shortly.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setSuccess(false);
              setForm(emptyForm);
            }}
            className="bg-oj-blue text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-oj-blue-hover transition-colors"
          >
            Start Another
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

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-oj-muted mb-6">
        <Link href="/" className="hover:text-oj-blue">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-oj-dark font-medium">Client Intake</span>
      </div>

      <div className="mb-8">
        <div className="text-xs font-bold text-oj-orange tracking-wider mb-1">
          PHASE 01
        </div>
        <h1 className="text-2xl font-bold text-oj-blue mb-1">Client Intake</h1>
        <p className="text-sm text-oj-muted">
          Complete this form to initiate a new ARIA client onboarding.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-oj-white border border-oj-border rounded-xl p-8 space-y-6 shadow-sm"
      >
        {/* CAM Name */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            CAM Name <span className="text-oj-orange">*</span>
          </label>
          <select
            required
            value={form.camId}
            onChange={(e) => setForm((f) => ({ ...f, camId: e.target.value }))}
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm text-oj-dark bg-white focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent"
          >
            <option value="">Select a CAM...</option>
            {cams.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {cams.length === 0 && (
            <p className="text-xs text-oj-muted mt-1.5">
              No CAMs configured.{" "}
              <Link href="/admin/cams" className="text-oj-blue underline">
                Add CAMs in the Control Centre.
              </Link>
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
              <Link href="/admin/channels" className="text-oj-blue underline">
                Add channels in the Control Centre.
              </Link>
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
            <p className="text-xs text-oj-muted mt-1.5">
              Please select at least one channel.
            </p>
          )}
        </div>

        {/* Client Start Date */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Client Start Date <span className="text-oj-orange">*</span>
          </label>
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, startDate: e.target.value }))
            }
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm text-oj-dark bg-white focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent"
          />
        </div>

        {/* Client Name */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Client Name <span className="text-oj-orange">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. ACME Retail (Pty) Ltd"
            value={form.clientName}
            onChange={(e) =>
              setForm((f) => ({ ...f, clientName: e.target.value }))
            }
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm text-oj-dark bg-white focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent placeholder:text-oj-muted"
          />
        </div>

        {/* Client Contact Name */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Client Contact Person <span className="text-oj-orange">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Full name"
            value={form.contactName}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactName: e.target.value }))
            }
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm text-oj-dark bg-white focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent placeholder:text-oj-muted"
          />
        </div>

        {/* Client Contact Email */}
        <div>
          <label className="block text-sm font-semibold text-oj-dark mb-1.5">
            Client Contact Email <span className="text-oj-orange">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="contact@client.com"
            value={form.contactEmail}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactEmail: e.target.value }))
            }
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm text-oj-dark bg-white focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent placeholder:text-oj-muted"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || form.channelIds.length === 0}
            className="flex-1 bg-oj-blue text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-oj-blue-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Intake"}
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

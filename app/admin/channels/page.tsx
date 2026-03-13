"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

type Channel = {
  id: string;
  name: string;
  mandateFileName?: string;
  mandateBase64?: string;
  mandateEmailSubject?: string;
  mandateEmailBody?: string;
};

type EditState = {
  name: string;
  mandateFileName: string;
  mandateBase64: string;
  mandateEmailSubject: string;
  mandateEmailBody: string;
};

export default function ManageChannels() {
  const { ready } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal state
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [editState, setEditState] = useState<EditState>({
    name: "",
    mandateFileName: "",
    mandateBase64: "",
    mandateEmailSubject: "",
    mandateEmailBody: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready) loadChannels();
  }, [ready]);

  const loadChannels = async () => {
    setLoading(true);
    const res = await fetch("/api/channels");
    setChannels(await res.json());
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    await loadChannels();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this channel?")) return;
    await fetch(`/api/channels/${id}`, { method: "DELETE" });
    await loadChannels();
  };

  const openEdit = (ch: Channel) => {
    setEditChannel(ch);
    setEditState({
      name: ch.name,
      mandateFileName: ch.mandateFileName ?? "",
      mandateBase64: ch.mandateBase64 ?? "",
      mandateEmailSubject: ch.mandateEmailSubject ?? "",
      mandateEmailBody: ch.mandateEmailBody ?? "",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditState((s) => ({
        ...s,
        mandateFileName: file.name,
        mandateBase64: ev.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setEditState((s) => ({ ...s, mandateFileName: "", mandateBase64: "" }));
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSaveEdit = async () => {
    if (!editChannel || !editState.name.trim()) return;
    setSaving(true);
    await fetch(`/api/channels/${editChannel.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editState.name.trim(),
        mandateFileName: editState.mandateFileName || undefined,
        mandateBase64: editState.mandateBase64 || undefined,
        mandateEmailSubject: editState.mandateEmailSubject.trim() || undefined,
        mandateEmailBody: editState.mandateEmailBody.trim() || undefined,
      }),
    });
    setEditChannel(null);
    await loadChannels();
    setSaving(false);
  };

  if (!ready) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm text-oj-muted mb-6">
        <Link href="/admin" className="hover:text-oj-blue">Control Centre</Link>
        <span>/</span>
        <span className="text-oj-dark font-medium">Channels</span>
      </div>

      <div className="mb-8">
        <div className="text-xs font-bold text-oj-orange tracking-widest mb-1 uppercase">Admin</div>
        <h1 className="text-2xl font-bold text-oj-blue mb-1">Manage Channels</h1>
        <p className="text-sm text-oj-muted">Retail channels available as multi-select options in the intake form. Configure mandate letters and email templates per channel.</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-oj-white border border-oj-border rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-oj-dark mb-4">Add New Channel</h2>
        <div className="flex gap-3">
          <input
            type="text"
            required
            placeholder="Channel name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-oj-blue text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            Add Channel
          </button>
        </div>
      </form>

      {/* Channel list */}
      <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-oj-muted">Loading...</div>
        ) : channels.length === 0 ? (
          <div className="p-8 text-center text-sm text-oj-muted">No channels added yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-oj-border bg-oj-bg">
                <th className="text-left px-5 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider">Channel Name</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider">Mandate</th>
                <th className="px-5 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {channels.map((ch, i) => (
                <tr key={ch.id} className={`border-b border-oj-border last:border-0 ${i % 2 === 1 ? "bg-oj-bg/50" : ""}`}>
                  <td className="px-5 py-3 font-medium text-oj-dark">{ch.name}</td>
                  <td className="px-5 py-3">
                    {ch.mandateBase64 ? (
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                        ✓ Ready
                      </span>
                    ) : (
                      <span className="text-xs text-oj-muted">Not set</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => openEdit(ch)} className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover">Edit</button>
                      <button onClick={() => handleDelete(ch.id)} className="text-xs font-semibold text-oj-orange hover:text-oj-orange-hover">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditChannel(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-oj-border">
              <h2 className="text-base font-bold text-oj-dark">Edit Channel</h2>
              <p className="text-xs text-oj-muted mt-0.5">Configure mandate letter and email template for this channel.</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Channel name */}
              <div>
                <label className="block text-xs font-semibold text-oj-dark mb-1.5">Channel Name</label>
                <input
                  type="text"
                  value={editState.name}
                  onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                  className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
                />
              </div>

              {/* Email subject */}
              <div>
                <label className="block text-xs font-semibold text-oj-dark mb-1.5">Mandate Email Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Beares — Mandate Letter"
                  value={editState.mandateEmailSubject}
                  onChange={(e) => setEditState((s) => ({ ...s, mandateEmailSubject: e.target.value }))}
                  className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
                />
              </div>

              {/* Email body */}
              <div>
                <label className="block text-xs font-semibold text-oj-dark mb-1.5">Mandate Email Body</label>
                <textarea
                  rows={5}
                  placeholder="Dear {contact name},&#10;&#10;Please find attached your mandate letter for the Beares channel..."
                  value={editState.mandateEmailBody}
                  onChange={(e) => setEditState((s) => ({ ...s, mandateEmailBody: e.target.value }))}
                  className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted resize-y"
                />
                <p className="text-xs text-oj-muted mt-1">Plain text. Each line becomes a paragraph in the email.</p>
              </div>

              {/* Mandate file upload */}
              <div>
                <label className="block text-xs font-semibold text-oj-dark mb-1.5">Mandate Letter (.docx)</label>
                {editState.mandateFileName ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <span className="text-sm font-medium text-green-700 flex-1 truncate">📄 {editState.mandateFileName}</span>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-oj-border rounded-lg p-4 text-center cursor-pointer hover:border-oj-blue transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <p className="text-sm text-oj-muted">Click to upload a .docx file</p>
                    <p className="text-xs text-oj-muted mt-0.5">Word documents only</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="p-6 border-t border-oj-border flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditChannel(null)}
                className="px-4 py-2 text-sm text-oj-muted border border-oj-border rounded-lg hover:text-oj-dark transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !editState.name.trim()}
                onClick={handleSaveEdit}
                className="px-5 py-2 text-sm font-semibold bg-oj-blue text-white rounded-lg hover:bg-oj-blue-hover transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

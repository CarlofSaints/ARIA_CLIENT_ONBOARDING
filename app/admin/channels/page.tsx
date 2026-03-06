"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

type Channel = { id: string; name: string };

export default function ManageChannels() {
  const { ready } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    await fetch(`/api/channels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditId(null);
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
        <p className="text-sm text-oj-muted">Retail channels available as multi-select options in the intake form.</p>
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
                <th className="px-5 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {channels.map((ch, i) =>
                editId === ch.id ? (
                  <tr key={ch.id} className={`border-b border-oj-border ${i % 2 === 1 ? "bg-oj-bg/50" : ""}`}>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-oj-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleSaveEdit(ch.id)} disabled={saving} className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover">Save</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-oj-muted hover:text-oj-dark">Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={ch.id} className={`border-b border-oj-border last:border-0 ${i % 2 === 1 ? "bg-oj-bg/50" : ""}`}>
                    <td className="px-5 py-3 font-medium text-oj-dark">{ch.name}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => { setEditId(ch.id); setEditName(ch.name); }} className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover">Edit</button>
                        <button onClick={() => handleDelete(ch.id)} className="text-xs font-semibold text-oj-orange hover:text-oj-orange-hover">Remove</button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

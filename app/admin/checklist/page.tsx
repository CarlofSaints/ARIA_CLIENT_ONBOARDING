"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

type ChecklistItem = {
  id: string;
  label: string;
  description?: string;
  section: string;
  type: "manual" | "auto" | "either";
  dynamic: boolean;
  order: number;
  active: boolean;
};

const SECTIONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "legal", label: "Legal & Compliance" },
  { value: "channels", label: "Channels" },
  { value: "technical", label: "Technical Setup" },
  { value: "training", label: "Training & Handover" },
];

const TYPE_COLORS: Record<string, string> = {
  manual: "bg-blue-50 text-blue-700 border-blue-200",
  auto: "bg-green-50 text-green-700 border-green-200",
  either: "bg-amber-50 text-amber-700 border-amber-200",
};

const emptyForm = {
  label: "",
  description: "",
  section: "onboarding",
  type: "manual" as "manual" | "auto" | "either",
  dynamic: false,
};

export default function ManageChecklist() {
  const { ready } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ready) loadItems();
  }, [ready]);

  const loadItems = async () => {
    setLoading(true);
    const res = await fetch("/api/checklist");
    const data: ChecklistItem[] = await res.json();
    setItems(data.sort((a, b) => a.order - b.order));
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    await loadItems();
    setSaving(false);
  };

  const handleToggleActive = async (item: ChecklistItem) => {
    await fetch(`/api/checklist/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    await loadItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this checklist item?")) return;
    await fetch(`/api/checklist/${id}`, { method: "DELETE" });
    await loadItems();
  };

  const startEdit = (item: ChecklistItem) => {
    setEditId(item.id);
    setEditForm({
      label: item.label,
      description: item.description ?? "",
      section: item.section,
      type: item.type,
      dynamic: item.dynamic,
    });
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    await fetch(`/api/checklist/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditId(null);
    await loadItems();
    setSaving(false);
  };

  const groupedItems = SECTIONS.map((sec) => ({
    ...sec,
    items: items.filter((i) => i.section === sec.value),
  })).filter((sec) => sec.items.length > 0);

  if (!ready) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm text-oj-muted mb-6">
        <Link href="/admin" className="hover:text-oj-blue">Control Centre</Link>
        <span>/</span>
        <span className="text-oj-dark font-medium">Onboarding Checklist</span>
      </div>

      <div className="mb-8">
        <div className="text-xs font-bold text-oj-orange tracking-widest mb-1 uppercase">Admin</div>
        <h1 className="text-2xl font-bold text-oj-blue mb-1">Main Onboarding Checklist</h1>
        <p className="text-sm text-oj-muted">
          Define the checklist items that appear on each client's onboarding progress page. Changes apply to all future and existing clients.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-oj-white border border-oj-border rounded-xl p-6 shadow-sm mb-8">
        <h2 className="text-sm font-bold text-oj-dark mb-4">Add Checklist Item</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            type="text" required placeholder="Item label"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="col-span-2 border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
          <input
            type="text" placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="col-span-2 border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
          <select
            value={form.section}
            onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
            className="border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue bg-white text-oj-dark"
          >
            {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "manual" | "auto" | "either" }))}
            className="border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue bg-white text-oj-dark"
          >
            <option value="manual">Manual — CAM ticks the box</option>
            <option value="auto">Auto — system checks automatically</option>
            <option value="either">Either — auto or manual</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-oj-dark cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.dynamic}
              onChange={(e) => setForm((f) => ({ ...f, dynamic: e.target.checked }))}
              className="accent-oj-blue"
            />
            Dynamic (one instance per assigned channel)
          </label>
          <button type="submit" disabled={saving}
            className="bg-oj-blue text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-50">
            Add Item
          </button>
        </div>
      </form>

      {/* Items grouped by section */}
      {loading ? (
        <div className="p-8 text-center text-sm text-oj-muted">Loading...</div>
      ) : (
        <div className="space-y-6">
          {groupedItems.map((sec) => (
            <div key={sec.value} className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-oj-bg border-b border-oj-border">
                <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">{sec.label}</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {sec.items.map((item, i) =>
                    editId === item.id ? (
                      <tr key={item.id} className={`border-b border-oj-border ${i % 2 === 1 ? "bg-oj-bg/40" : ""}`}>
                        <td className="px-4 py-3" colSpan={4}>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                              className="border border-oj-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue col-span-2" placeholder="Label" />
                            <input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                              className="border border-oj-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue col-span-2" placeholder="Description" />
                            <select value={editForm.section} onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                              className="border border-oj-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue bg-white">
                              {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <select value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as "manual" | "auto" | "either" }))}
                              className="border border-oj-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue bg-white">
                              <option value="manual">Manual</option>
                              <option value="auto">Auto</option>
                              <option value="either">Either</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-oj-dark cursor-pointer select-none">
                              <input type="checkbox" checked={editForm.dynamic} onChange={(e) => setEditForm((f) => ({ ...f, dynamic: e.target.checked }))} className="accent-oj-blue" />
                              Dynamic (per channel)
                            </label>
                            <div className="flex gap-2">
                              <button onClick={() => handleSaveEdit(item.id)} disabled={saving} className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover">Save</button>
                              <button onClick={() => setEditId(null)} className="text-xs text-oj-muted hover:text-oj-dark">Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.id} className={`border-b border-oj-border last:border-0 ${i % 2 === 1 ? "bg-oj-bg/40" : ""} ${!item.active ? "opacity-40" : ""}`}>
                        <td className="px-4 py-3 w-8 text-oj-muted text-xs">{item.order}</td>
                        <td className="px-4 py-3 flex-1">
                          <div className="font-medium text-oj-dark text-sm">{item.label}</div>
                          {item.description && <div className="text-xs text-oj-muted mt-0.5">{item.description}</div>}
                          {item.dynamic && <span className="text-xs text-purple-600 font-medium">per-channel</span>}
                        </td>
                        <td className="px-4 py-3 w-28">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${TYPE_COLORS[item.type]}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right w-36">
                          <div className="flex gap-3 justify-end">
                            <button onClick={() => startEdit(item)} className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover">Edit</button>
                            <button onClick={() => handleToggleActive(item)} className="text-xs font-semibold text-oj-muted hover:text-oj-dark">
                              {item.active ? "Disable" : "Enable"}
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="text-xs font-semibold text-oj-orange hover:text-oj-orange-hover">Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

type RoleOption = { id: string; label: string; active: boolean; order: number };
type CustomField = {
  id: string; label: string;
  type: "text" | "email" | "tel" | "select";
  options?: string[];
  required: boolean; active: boolean; order: number;
};
type PersonnelConfig = { roleOptions: RoleOption[]; customFields: CustomField[] };

export default function PersonnelAdminPage() {
  const { ready } = useAuth();
  const [config, setConfig] = useState<PersonnelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // New role form
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [roleError, setRoleError] = useState("");

  // New custom field form
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "email" | "tel" | "select">("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [fieldError, setFieldError] = useState("");

  // Inline edit state for roles
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleLabel, setEditingRoleLabel] = useState("");

  useEffect(() => {
    if (!ready) return;
    fetch("/api/personnel-config")
      .then((r) => r.json())
      .then((data: PersonnelConfig) => { setConfig(data); setLoading(false); });
  }, [ready]);

  const saveConfig = async (updated: PersonnelConfig) => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/personnel-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSaveMsg("Saved.");
        setTimeout(() => setSaveMsg(""), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  // --- Role actions ---
  const addRole = () => {
    if (!newRoleLabel.trim()) { setRoleError("Label is required"); return; }
    if (!config) return;
    setRoleError("");
    const maxOrder = config.roleOptions.reduce((m, r) => Math.max(m, r.order), 0);
    const newRole: RoleOption = {
      id: `role-${Date.now()}`,
      label: newRoleLabel.trim(),
      active: true,
      order: maxOrder + 1,
    };
    const updated = { ...config, roleOptions: [...config.roleOptions, newRole] };
    saveConfig(updated);
    setNewRoleLabel("");
  };

  const toggleRole = (id: string) => {
    if (!config) return;
    const updated = {
      ...config,
      roleOptions: config.roleOptions.map((r) => r.id === id ? { ...r, active: !r.active } : r),
    };
    saveConfig(updated);
  };

  const deleteRole = (id: string) => {
    if (!config) return;
    const updated = { ...config, roleOptions: config.roleOptions.filter((r) => r.id !== id) };
    saveConfig(updated);
  };

  const saveRoleEdit = (id: string) => {
    if (!config || !editingRoleLabel.trim()) return;
    const updated = {
      ...config,
      roleOptions: config.roleOptions.map((r) => r.id === id ? { ...r, label: editingRoleLabel.trim() } : r),
    };
    saveConfig(updated);
    setEditingRoleId(null);
  };

  // --- Custom field actions ---
  const addField = () => {
    if (!newFieldLabel.trim()) { setFieldError("Label is required"); return; }
    if (!config) return;
    setFieldError("");
    const maxOrder = config.customFields.reduce((m, f) => Math.max(m, f.order), 0);
    const newField: CustomField = {
      id: `cf-${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      options: newFieldType === "select" ? newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
      required: newFieldRequired,
      active: true,
      order: maxOrder + 1,
    };
    const updated = { ...config, customFields: [...config.customFields, newField] };
    saveConfig(updated);
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setNewFieldOptions("");
  };

  const toggleField = (id: string) => {
    if (!config) return;
    const updated = {
      ...config,
      customFields: config.customFields.map((f) => f.id === id ? { ...f, active: !f.active } : f),
    };
    saveConfig(updated);
  };

  const deleteField = (id: string) => {
    if (!config) return;
    const updated = { ...config, customFields: config.customFields.filter((f) => f.id !== id) };
    saveConfig(updated);
  };

  if (!ready || loading) return null;
  if (!config) return <div className="p-10 text-center text-sm text-gray-400">Failed to load config.</div>;

  const sortedRoles = [...config.roleOptions].sort((a, b) => a.order - b.order);
  const sortedFields = [...config.customFields].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/admin" className="hover:text-[#3D6273]">Admin</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Personnel Form</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-[#E04E2A] tracking-widest mb-1 uppercase">Admin</div>
          <h1 className="text-2xl font-bold text-[#3D6273]">Personnel Form Config</h1>
          <p className="text-sm text-gray-400 mt-1">Manage role options and custom fields shown on the personnel collection form.</p>
        </div>
        {saving && <span className="text-sm text-gray-400">Saving…</span>}
        {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
      </div>

      {/* ---- Role Options ---- */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#F5F7F8]">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Role Options</h2>
        </div>

        {/* Add role form */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">New Role Label</label>
            <input
              type="text"
              value={newRoleLabel}
              onChange={(e) => { setNewRoleLabel(e.target.value); setRoleError(""); }}
              onKeyDown={(e) => e.key === "Enter" && addRole()}
              placeholder="e.g. National Sales Manager"
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D6273] ${roleError ? "border-red-400" : "border-gray-300"}`}
            />
            {roleError && <p className="text-xs text-red-500 mt-0.5">{roleError}</p>}
          </div>
          <button
            onClick={addRole}
            disabled={saving}
            className="bg-[#3D6273] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#2d4e5e] transition-colors disabled:opacity-50"
          >
            Add Role
          </button>
        </div>

        {/* Role table */}
        {sortedRoles.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">No role options. Add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Label</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRoles.map((role) => (
                <tr key={role.id} className="hover:bg-[#F5F7F8]/50">
                  <td className="px-6 py-3 text-gray-400 text-xs">{role.order}</td>
                  <td className="px-4 py-3">
                    {editingRoleId === role.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingRoleLabel}
                          onChange={(e) => setEditingRoleLabel(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveRoleEdit(role.id); if (e.key === "Escape") setEditingRoleId(null); }}
                          autoFocus
                          className="text-sm border border-[#3D6273] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3D6273]"
                        />
                        <button onClick={() => saveRoleEdit(role.id)} className="text-xs text-green-600 font-semibold hover:text-green-700">Save</button>
                        <button onClick={() => setEditingRoleId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <span className={role.active ? "text-gray-800 font-medium" : "text-gray-400 line-through"}>{role.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-400 border border-gray-200"}`}>
                      {role.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingRoleId !== role.id && (
                        <button
                          onClick={() => { setEditingRoleId(role.id); setEditingRoleLabel(role.label); }}
                          className="text-xs text-[#3D6273] hover:underline font-medium"
                        >Edit</button>
                      )}
                      <button
                        onClick={() => toggleRole(role.id)}
                        className="text-xs text-amber-600 hover:underline font-medium"
                      >{role.active ? "Deactivate" : "Activate"}</button>
                      <button
                        onClick={() => deleteRole(role.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium"
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Custom Fields ---- */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#F5F7F8]">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Custom Fields</h2>
          <p className="text-xs text-gray-400 mt-0.5">Additional columns shown on the personnel form after the standard fields.</p>
        </div>

        {/* Add field form */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Label</label>
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => { setNewFieldLabel(e.target.value); setFieldError(""); }}
                placeholder="e.g. Department"
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D6273] ${fieldError ? "border-red-400" : "border-gray-300"}`}
              />
              {fieldError && <p className="text-xs text-red-500 mt-0.5">{fieldError}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as "text" | "email" | "tel" | "select")}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3D6273]"
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="tel">Phone</option>
                <option value="select">Select</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                id="cf-required"
                checked={newFieldRequired}
                onChange={(e) => setNewFieldRequired(e.target.checked)}
                className="accent-[#3D6273] w-4 h-4"
              />
              <label htmlFor="cf-required" className="text-sm text-gray-600 cursor-pointer">Required</label>
            </div>
            <button
              onClick={addField}
              disabled={saving}
              className="bg-[#3D6273] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#2d4e5e] transition-colors disabled:opacity-50 pb-2 self-end"
            >
              Add Field
            </button>
          </div>
          {newFieldType === "select" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Options (comma-separated)</label>
              <input
                type="text"
                value={newFieldOptions}
                onChange={(e) => setNewFieldOptions(e.target.value)}
                placeholder="Option A, Option B, Option C"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D6273]"
              />
            </div>
          )}
        </div>

        {/* Field table */}
        {sortedFields.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">No custom fields. Add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Label</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Required</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedFields.map((field) => (
                <tr key={field.id} className="hover:bg-[#F5F7F8]/50">
                  <td className="px-6 py-3">
                    <span className={field.active ? "text-gray-800 font-medium" : "text-gray-400 line-through"}>{field.label}</span>
                    {field.options && field.options.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{field.options.join(", ")}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{field.type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${field.required ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-gray-50 text-gray-400 border border-gray-200"}`}>
                      {field.required ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${field.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-400 border border-gray-200"}`}>
                      {field.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleField(field.id)} className="text-xs text-amber-600 hover:underline font-medium">
                        {field.active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => deleteField(field.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

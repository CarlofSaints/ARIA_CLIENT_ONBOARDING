"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CAM = { id: string; name: string; email: string };

export default function ManageCAMs() {
  const router = useRouter();
  const [cams, setCams] = useState<CAM[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("oj_admin")) {
      router.replace("/admin/login");
      return;
    }
    loadCams();
  }, [router]);

  const loadCams = async () => {
    setLoading(true);
    const res = await fetch("/api/cams");
    const data = await res.json();
    setCams(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/cams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", email: "" });
    await loadCams();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this CAM?")) return;
    await fetch(`/api/cams/${id}`, { method: "DELETE" });
    await loadCams();
  };

  const startEdit = (cam: CAM) => {
    setEditId(cam.id);
    setEditForm({ name: cam.name, email: cam.email });
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    await fetch(`/api/cams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditId(null);
    await loadCams();
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-oj-muted mb-6">
        <Link href="/admin" className="hover:text-oj-blue">
          Control Centre
        </Link>
        <span>/</span>
        <span className="text-oj-dark font-medium">CAMs</span>
      </div>

      <div className="mb-8">
        <div className="text-xs font-bold text-oj-orange tracking-widest mb-1 uppercase">
          Admin
        </div>
        <h1 className="text-2xl font-bold text-oj-blue mb-1">
          Manage CAMs
        </h1>
        <p className="text-sm text-oj-muted">
          Client Account Managers available in the onboarding intake form.
        </p>
      </div>

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="bg-oj-white border border-oj-border rounded-xl p-6 shadow-sm mb-6"
      >
        <h2 className="text-sm font-bold text-oj-dark mb-4">Add New CAM</h2>
        <div className="flex gap-3">
          <input
            type="text"
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="flex-1 border border-oj-border rounded-lg px-4 py-2.5 text-sm text-oj-dark bg-white focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent placeholder:text-oj-muted"
          />
          <input
            type="email"
            required
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="flex-1 border border-oj-border rounded-lg px-4 py-2.5 text-sm text-oj-dark bg-white focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent placeholder:text-oj-muted"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-oj-blue text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            Add CAM
          </button>
        </div>
      </form>

      {/* CAM list */}
      <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-oj-muted">
            Loading...
          </div>
        ) : cams.length === 0 ? (
          <div className="p-8 text-center text-sm text-oj-muted">
            No CAMs added yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-oj-border bg-oj-bg">
                <th className="text-left px-5 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider">
                  Email
                </th>
                <th className="px-5 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {cams.map((cam, i) =>
                editId === cam.id ? (
                  <tr
                    key={cam.id}
                    className={`border-b border-oj-border ${i % 2 === 1 ? "bg-oj-bg/50" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="w-full border border-oj-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, email: e.target.value }))
                        }
                        className="w-full border border-oj-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleSaveEdit(cam.id)}
                          disabled={saving}
                          className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-xs text-oj-muted hover:text-oj-dark"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={cam.id}
                    className={`border-b border-oj-border last:border-0 ${i % 2 === 1 ? "bg-oj-bg/50" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-oj-dark">
                      {cam.name}
                    </td>
                    <td className="px-5 py-3 text-oj-muted">{cam.email}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => startEdit(cam)}
                          className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cam.id)}
                          className="text-xs font-semibold text-oj-orange hover:text-oj-orange-hover"
                        >
                          Remove
                        </button>
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

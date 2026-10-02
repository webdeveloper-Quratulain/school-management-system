import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import Modal from "../../components/Modal";

const emptyForm = { name: "", email: "", password: "", phone: "" };
const inputClass =
  "mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function Parents() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setParents(await api("/parents"));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setModal({});
  }

  function openEdit(p) {
    setForm({ name: p.user.name, email: p.user.email, password: "", phone: p.phone ?? "" });
    setFormError("");
    setModal({ id: p.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
    };
    try {
      if (modal.id) {
        await api(`/parents/${modal.id}`, { method: "PUT", body });
      } else {
        await api("/parents", { method: "POST", body: { ...body, password: form.password } });
      }
      setModal(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(p) {
    const ok = window.confirm(
      `Deactivate ${p.user.name}?\n\nThey will no longer be able to log in. Their children's records are kept.`
    );
    if (!ok) return;
    try {
      await api(`/parents/${p.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Parents</h1>
        <button
          onClick={openCreate}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add parent
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Children</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && parents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No parents yet. Click "Add parent" to create one.
                </td>
              </tr>
            )}
            {parents.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{p.user.name}</td>
                <td className="px-4 py-3">{p.user.email}</td>
                <td className="px-4 py-3">{p.phone || "—"}</td>
                <td className="px-4 py-3">
                  {p.students.length ? p.students.map((s) => s.user.name).join(", ") : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.user.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {p.user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => openEdit(p)}
                    className="mr-3 text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  {p.user.isActive && (
                    <button
                      onClick={() => handleDeactivate(p)}
                      className="text-red-600 hover:underline"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.id ? "Edit parent" : "Add parent"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <label className={labelClass} htmlFor="name">Full name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={inputClass}
            />

            <label className={labelClass} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className={inputClass}
            />

            {!modal.id && (
              <>
                <label className={labelClass} htmlFor="password">
                  Password (at least 8 characters)
                </label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </>
            )}

            <label className={labelClass} htmlFor="phone">Phone (optional)</label>
            <input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mb-6 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
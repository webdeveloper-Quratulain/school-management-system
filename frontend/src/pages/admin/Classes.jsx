import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import Modal from "../../components/Modal";

const emptyForm = { name: "", section: "", classTeacherId: "" };

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([api("/classes"), api("/teachers")]);
      setClasses(c);
      setTeachers(t);
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

  function openEdit(c) {
    setForm({
      name: c.name,
      section: c.section,
      classTeacherId: c.classTeacherId ?? "",
    });
    setFormError("");
    setModal({ id: c.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {
      name: form.name.trim(),
      section: form.section.trim(),
      classTeacherId: form.classTeacherId ? Number(form.classTeacherId) : null,
    };
    try {
      if (modal.id) {
        await api(`/classes/${modal.id}`, { method: "PUT", body });
      } else {
        await api("/classes", { method: "POST", body });
      }
      setModal(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c) {
    const ok = window.confirm(
      `Delete ${c.name} ${c.section}?\n\nThis also deletes the class's exams and exam results, and its students will be left without a class. This cannot be undone.`
    );
    if (!ok) return;
    try {
      await api(`/classes/${c.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const teacherName = (id) => teachers.find((t) => t.id === id)?.user.name ?? "—";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Classes</h1>
        <button
          onClick={openCreate}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add class
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Class teacher</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && classes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No classes yet. Click "Add class" to create one.
                </td>
              </tr>
            )}
            {classes.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-3">{c.section}</td>
                <td className="px-4 py-3">{teacherName(c.classTeacherId)}</td>
                <td className="px-4 py-3">{c._count.students}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(c)}
                    className="mr-3 text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.id ? "Edit class" : "Add class"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="name">
              Class name
            </label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Grade 5"
              className="mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />

            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="section">
              Section
            </label>
            <input
              id="section"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              required
              placeholder="A"
              className="mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />

            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="teacher">
              Class teacher (optional)
            </label>
            <select
              id="teacher"
              value={form.classTeacherId}
              onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}
              className="mb-6 w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">None</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user.name}
                  {t.user.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </select>

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
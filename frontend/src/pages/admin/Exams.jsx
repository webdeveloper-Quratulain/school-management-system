import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import Modal from "../../components/Modal";
import { useClasses } from "../../useClasses";

const emptyForm = { name: "", classId: "", date: "" };
const inputClass =
  "mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function Exams() {
  const { classes } = useClasses();
  const [exams, setExams] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setExams(await api(classFilter ? `/exams?classId=${classFilter}` : "/exams"));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm({ ...emptyForm, classId: classFilter });
    setFormError("");
    setModal({});
  }

  function openEdit(x) {
    setForm({ name: x.name, classId: x.classId, date: x.date.slice(0, 10) });
    setFormError("");
    setModal({ id: x.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (modal.id) {
        await api(`/exams/${modal.id}`, {
          method: "PUT",
          body: { name: form.name.trim(), date: form.date },
        });
      } else {
        await api("/exams", {
          method: "POST",
          body: { name: form.name.trim(), classId: Number(form.classId), date: form.date },
        });
      }
      setModal(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(x) {
    const ok = window.confirm(
      `Delete "${x.name}" for ${x.class.name} ${x.class.section}?\n\nAll marks entered for this exam are deleted too. This cannot be undone.`
    );
    if (!ok) return;
    try {
      await api(`/exams/${x.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Exams</h1>
        <div className="flex items-center gap-3">
          <select
            value={classFilter}
            onChange={(e) => {
              setLoading(true);
              setClassFilter(e.target.value);
            }}
            aria-label="Filter by class"
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section}
              </option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add exam
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Exam</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && exams.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No exams yet. Click "Add exam" to create one.
                </td>
              </tr>
            )}
            {exams.map((x) => (
              <tr key={x.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{x.name}</td>
                <td className="px-4 py-3">
                  {x.class.name} {x.class.section}
                </td>
                <td className="px-4 py-3">{x.date.slice(0, 10)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => openEdit(x)}
                    className="mr-3 text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(x)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.id ? "Edit exam" : "Add exam"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <label className={labelClass} htmlFor="name">Exam name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Midterm"
              className={inputClass}
            />

            <label className={labelClass} htmlFor="class">Class</label>
            <select
              id="class"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              required
              disabled={Boolean(modal.id)}
              className="mb-1 w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Choose a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section}
                </option>
              ))}
            </select>
            {modal.id && (
              <p className="mb-4 text-xs text-slate-500">
                The class of an existing exam can't be changed.
              </p>
            )}
            {!modal.id && <div className="mb-4" />}

            <label className={labelClass} htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
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
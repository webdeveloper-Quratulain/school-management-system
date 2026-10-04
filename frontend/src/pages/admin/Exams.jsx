import { useCallback, useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { api } from "../../api";
import Modal from "../../components/Modal";
import { useClasses } from "../../useClasses";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";

const emptyForm = { name: "", classId: "", date: "" };
const inputClass =
  "mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-[#1a4033] focus:outline-none";
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

  // hide the red error after 6 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

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
    <>
      <PageHeader title="Exams" subtitle="Schedule exams for each class.">
        <div className="flex flex-wrap items-center gap-3">
          {!loading && (
            <span className="stat-chip stat-chip--present">
              <b>{exams.length}</b> {exams.length === 1 ? "exam" : "exams"}
            </span>
          )}
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
            className="rounded bg-[#1a4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#245a47]"
          >
            Add exam
          </button>
        </div>
      </PageHeader>

      <div className="page-body">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg bg-white px-4 py-6 text-center text-sm text-slate-500 shadow">
            Loading...
          </div>
        )}

        {!loading && exams.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            message={
              classFilter
                ? "No exams for this class yet."
                : "No exams yet. Click Add exam to create the first one."
            }
          />
        )}

        {!loading && exams.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow">
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
                {exams.map((x) => (
                  <tr key={x.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{x.name}</td>
                    <td className="px-4 py-3">
                      {x.class.name} {x.class.section}
                    </td>
                    <td className="px-4 py-3">{x.date.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(x)}
                        className="mr-3 text-[#1a4033] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(x)}
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
        )}

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
                className="mb-1 w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-[#1a4033] focus:outline-none disabled:bg-slate-100"
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
                className="mb-6 w-full rounded border border-slate-300 px-3 py-2 focus:border-[#1a4033] focus:outline-none"
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
                  className="rounded bg-[#1a4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#245a47] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </>
  );
}
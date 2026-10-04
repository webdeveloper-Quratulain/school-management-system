import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { api } from "../../api";
import Modal from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";

const emptyForm = { name: "", code: "" };

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setSubjects(await api("/subjects"));
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

  // hide the red error after 6 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setModal({});
  }

  function openEdit(s) {
    setForm({ name: s.name, code: s.code });
    setFormError("");
    setModal({ id: s.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = { name: form.name.trim(), code: form.code.trim() };
    try {
      if (modal.id) {
        await api(`/subjects/${modal.id}`, { method: "PUT", body });
      } else {
        await api("/subjects", { method: "POST", body });
      }
      setModal(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s) {
    const ok = window.confirm(
      `Delete ${s.name}?\n\nThis removes it from every class timetable, and it will fail if exam marks already exist for it. This cannot be undone.`
    );
    if (!ok) return;
    try {
      await api(`/subjects/${s.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Subjects" subtitle="The list of subjects your school teaches.">
        <div className="flex flex-wrap items-center gap-3">
          {!loading && (
            <span className="stat-chip stat-chip--present">
              <b>{subjects.length}</b> {subjects.length === 1 ? "subject" : "subjects"}
            </span>
          )}
          <button
            onClick={openCreate}
            className="rounded bg-[#1a4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#245a47]"
          >
            Add subject
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

        {!loading && subjects.length === 0 && (
          <EmptyState
            icon={BookOpen}
            message="No subjects yet. Click Add subject to create the first one."
          />
        )}

        {!loading && subjects.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3">{s.code}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(s)}
                        className="mr-3 text-[#1a4033] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
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
          <Modal title={modal.id ? "Edit subject" : "Add subject"} onClose={() => setModal(null)}>
            <form onSubmit={handleSubmit}>
              {formError && (
                <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="name">
                Subject name
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Mathematics"
                className="mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-[#1a4033] focus:outline-none"
              />

              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="code">
                Code
              </label>
              <input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
                placeholder="MATH"
                className="mb-6 w-full rounded border border-slate-300 px-3 py-2 uppercase focus:border-[#1a4033] focus:outline-none"
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
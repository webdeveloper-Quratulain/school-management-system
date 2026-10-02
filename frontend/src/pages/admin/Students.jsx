import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import Modal from "../../components/Modal";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  rollNumber: "",
  dateOfBirth: "",
  classId: "",
  parentId: "",
};
const inputClass =
  "mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none";
const selectClass =
  "mb-4 w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadOptions = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([api("/classes"), api("/parents")]);
      setClasses(c);
      setParents(p);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      setStudents(await api(classFilter ? `/students?classId=${classFilter}` : "/students"));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setModal({});
  }

  function openEdit(s) {
    setForm({
      name: s.user.name,
      email: s.user.email,
      password: "",
      rollNumber: s.rollNumber,
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : "",
      classId: s.classId ?? "",
      parentId: s.parentId ?? "",
    });
    setFormError("");
    setModal({ id: s.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      rollNumber: form.rollNumber.trim(),
      dateOfBirth: form.dateOfBirth || null,
      classId: form.classId ? Number(form.classId) : null,
      parentId: form.parentId ? Number(form.parentId) : null,
    };
    try {
      if (modal.id) {
        await api(`/students/${modal.id}`, { method: "PUT", body });
      } else {
        await api("/students", { method: "POST", body: { ...body, password: form.password } });
      }
      setModal(null);
      setForm(emptyForm);
      await loadStudents();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(s) {
    const ok = window.confirm(
      `Deactivate ${s.user.name}?\n\nThey will no longer be able to log in. Their attendance, marks and fees are kept.`
    );
    if (!ok) return;
    try {
      await api(`/students/${s.id}`, { method: "DELETE" });
      await loadStudents();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Students</h1>
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
            Add student
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
              <th className="px-4 py-3">Roll no.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Parent</th>
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
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No students found.
                </td>
              </tr>
            )}
            {students.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{s.rollNumber}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{s.user.name}</td>
                <td className="px-4 py-3">
                  {s.class ? `${s.class.name} ${s.class.section}` : "—"}
                </td>
                <td className="px-4 py-3">{s.parent ? s.parent.user.name : "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.user.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {s.user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => openEdit(s)}
                    className="mr-3 text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  {s.user.isActive && (
                    <button
                      onClick={() => handleDeactivate(s)}
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
        <Modal title={modal.id ? "Edit student" : "Add student"} onClose={() => setModal(null)}>
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

            <label className={labelClass} htmlFor="roll">Roll number</label>
            <input
              id="roll"
              value={form.rollNumber}
              onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
              required
              placeholder="G5A-02"
              className={inputClass}
            />

            <label className={labelClass} htmlFor="dob">Date of birth (optional)</label>
            <input
              id="dob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              className={inputClass}
            />

            <label className={labelClass} htmlFor="class">Class (optional)</label>
            <select
              id="class"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className={selectClass}
            >
              <option value="">No class yet</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section}
                </option>
              ))}
            </select>

            <label className={labelClass} htmlFor="parent">Parent (optional)</label>
            <select
              id="parent"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="mb-6 w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">No parent yet</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name}
                  {p.user.isActive ? "" : " (inactive)"}
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
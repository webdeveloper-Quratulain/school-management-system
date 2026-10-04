import { Presentation } from "lucide-react";
import Avatar from "../../components/Avatar";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import Modal from "../../components/Modal";

const emptyForm = { name: "", email: "", password: "", phone: "", qualification: "" };
const inputClass =
  "mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-[#1a4033] focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeachers(await api("/teachers"));
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

  function openEdit(t) {
    setForm({
      name: t.user.name,
      email: t.user.email,
      password: "",
      phone: t.phone ?? "",
      qualification: t.qualification ?? "",
    });
    setFormError("");
    setModal({ id: t.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      qualification: form.qualification.trim() || null,
    };
    try {
      if (modal.id) {
        await api(`/teachers/${modal.id}`, { method: "PUT", body });
      } else {
        await api("/teachers", { method: "POST", body: { ...body, password: form.password } });
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

  async function handleDeactivate(t) {
    const ok = window.confirm(
      `Deactivate ${t.user.name}?\n\nThey will no longer be able to log in. Their past records are kept.`
    );
    if (!ok) return;
    try {
      await api(`/teachers/${t.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }
  async function setActive(person, isActive) {
  try {
    await api(`/users/${person.user.id}/status`, { method: "PATCH", body: { isActive } });
    await load();
  } catch (err) {
    setError(err.message);
  }
}
async function handleDelete(person) {
  const ok = window.confirm(
    `Permanently delete ${person.user.name}?\n\nThis only works for people with no records. It cannot be undone. To keep their history, use Deactivate instead.`
  );
  if (!ok) return;
  try {
    await api(`/users/${person.user.id}`, { method: "DELETE" });
    await load();
  } catch (err) {
    setError(err.message);
  }
}

  return (
    <>
      <PageHeader title="Teachers" subtitle="View and manage all teachers.">
        <div className="flex flex-wrap items-center gap-3">
          {!loading && (
            <span className="stat-chip stat-chip--present">
              <b>{teachers.length}</b> {teachers.length === 1 ? "teacher" : "teachers"}
            </span>
          )}
          <button
            onClick={openCreate}
            className="rounded bg-[#1a4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#245a47]"
          >
            Add teacher
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

        {!loading && teachers.length === 0 && (
          <EmptyState
            icon={Presentation}
            message="No teachers yet. Click Add teacher to create the first one."
          />
        )}

        {!loading && teachers.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Qualification</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.user.name} />
                        <span className="font-medium text-slate-800">{t.user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{t.user.email}</td>
                    <td className="px-4 py-3">{t.phone || "—"}</td>
                    <td className="px-4 py-3">{t.qualification || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {t.user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(t)}
                        className="mr-3 text-[#1a4033] hover:underline"
                      >
                        Edit
                      </button>
                      {t.user.isActive && (
                        <button
                          onClick={() => handleDeactivate(t)}
                          className="text-red-600 hover:underline"
                        >
                          Deactivate
                        </button>
                        
                      )}
                      {!t.user.isActive && (
                      <button
                        onClick={() => setActive(t, true)}
                        className="text-green-700 hover:underline"
                      >
                        Reactivate
                      </button>
                    )}
                    <button
                        onClick={() => handleDelete(t)}
                        className="ml-3 text-slate-500 hover:text-red-600 hover:underline"
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
          <Modal title={modal.id ? "Edit teacher" : "Add teacher"} onClose={() => setModal(null)}>
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
                className={inputClass}
              />

              <label className={labelClass} htmlFor="qualification">
                Qualification (optional)
              </label>
              <input
                id="qualification"
                value={form.qualification}
                onChange={(e) => setForm({ ...form, qualification: e.target.value })}
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
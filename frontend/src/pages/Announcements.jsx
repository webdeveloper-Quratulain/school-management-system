import { useCallback, useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";

const AUDIENCE_LABEL = {
  ALL: "Everyone",
  TEACHERS: "Teachers",
  STUDENTS: "Students",
  PARENTS: "Parents",
};
const AUDIENCE_STYLE = {
  ALL: "bg-[#e3efe9] text-[#1a4033]",
  TEACHERS: "bg-sky-100 text-sky-700",
  STUDENTS: "bg-green-100 text-green-700",
  PARENTS: "bg-amber-100 text-amber-700",
};
const when = (iso) =>
  new Date(iso).toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const inputClass =
  "mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-[#1a4033] focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function Announcements() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const canPost = isAdmin || user.role === "TEACHER";
  const audiences = isAdmin ? ["ALL", "TEACHERS", "STUDENTS", "PARENTS"] : ["STUDENTS", "PARENTS"];
  const blank = () => ({ title: "", message: "", audience: audiences[0] });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api("/announcements"));
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

  // hide the green message after 4 seconds
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  // hide the red error after 6 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  function openCreate() {
    setForm(blank());
    setFormError("");
    setModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const res = await api("/announcements", {
        method: "POST",
        body: {
          title: form.title.trim(),
          message: form.message.trim(),
          audience: form.audience,
        },
      });
      setMessage(
        `Announcement posted. ${res.notified} ${res.notified === 1 ? "person was" : "people were"} notified.`
      );
      setModal(false);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a) {
    const ok = window.confirm(
      `Delete "${a.title}"?\n\nPeople who already received a notification about it will still see that notification.`
    );
    if (!ok) return;
    setMessage("");
    try {
      await api(`/announcements/${a.id}`, { method: "DELETE" });
      setMessage("Announcement deleted");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Announcements" subtitle="News and notices from the school.">
        <div className="flex flex-wrap items-center gap-3">
          {!loading && (
            <span className="stat-chip stat-chip--present">
              <b>{items.length}</b> {items.length === 1 ? "announcement" : "announcements"}
            </span>
          )}
          {canPost && (
            <button
              onClick={openCreate}
              className="rounded bg-[#1a4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#245a47]"
            >
              New announcement
            </button>
          )}
        </div>
      </PageHeader>

      <div className="page-body">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </div>
        )}

        {loading && (
          <div className="rounded-lg bg-white px-4 py-6 text-center text-sm text-slate-500 shadow">
            Loading...
          </div>
        )}

        {!loading && items.length === 0 && (
          <EmptyState icon={Megaphone} message="There are no announcements yet." />
        )}

        {items.map((a) => (
          <div
            key={a.id}
            className="mb-4 rounded-lg border border-slate-200 border-l-4 border-l-[#f5b82e] bg-white p-4 shadow"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-semibold text-slate-800">{a.title}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${AUDIENCE_STYLE[a.audience]}`}
              >
                {AUDIENCE_LABEL[a.audience]}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{a.message}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {a.createdBy.name} · {when(a.createdAt)}
              </span>
              {isAdmin && (
                <button onClick={() => handleDelete(a)} className="text-red-600 hover:underline">
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}

        {modal && (
          <Modal title="New announcement" onClose={() => setModal(false)}>
            <form onSubmit={handleSubmit}>
              {formError && (
                <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <label className={labelClass} htmlFor="audience">Send to</label>
              <select
                id="audience"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                className="mb-4 w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-[#1a4033] focus:outline-none"
              >
                {audiences.map((a) => (
                  <option key={a} value={a}>
                    {AUDIENCE_LABEL[a]}
                  </option>
                ))}
              </select>

              <label className={labelClass} htmlFor="title">Title</label>
              <input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                maxLength={150}
                className={inputClass}
              />

              <label className={labelClass} htmlFor="message">Message</label>
              <textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                maxLength={2000}
                rows={5}
                className="mb-6 w-full rounded border border-slate-300 px-3 py-2 focus:border-[#1a4033] focus:outline-none"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-[#1a4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#245a47] disabled:opacity-60"
                >
                  {saving ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </>
  );
}
import { useEffect, useState } from "react";
import { api } from "../../api";
import { useClasses } from "../../useClasses";

const STATUSES = [
  { value: "PRESENT", label: "Present", on: "border-green-600 bg-green-600 text-white" },
  { value: "ABSENT", label: "Absent", on: "border-red-600 bg-red-600 text-white" },
  { value: "LATE", label: "Late", on: "border-amber-500 bg-amber-500 text-white" },
  { value: "LEAVE", label: "Leave", on: "border-sky-600 bg-sky-600 text-white" },
];

const today = () => new Date().toLocaleDateString("en-CA");

export default function Attendance() {
  const { classes, loading: classesLoading, error: classesError } = useClasses();
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today());
  const [sheet, setSheet] = useState({ key: "", rows: [] });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const ready = Boolean(classId && date);
  const key = `${classId}|${date}`;
  const loading = ready && sheet.key !== key;
  const rows = sheet.key === key ? sheet.rows : [];
  const unmarked = rows.filter((r) => !r.status).length;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    api(`/attendance?classId=${classId}&date=${date}`)
      .then((data) => {
        if (cancelled) return;
        setSheet({ key, rows: data });
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setSheet({ key, rows: [] });
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, key, classId, date]);

  function changeFilter(setter) {
    return (e) => {
      setter(e.target.value);
      setMessage("");
      setError("");
    };
  }

  function setStatus(studentId, status) {
    setMessage("");
    setSheet((s) => ({
      ...s,
      rows: s.rows.map((r) => (r.studentId === studentId ? { ...r, status } : r)),
    }));
  }

  function markAllPresent() {
    setMessage("");
    setSheet((s) => ({ ...s, rows: s.rows.map((r) => ({ ...r, status: "PRESENT" })) }));
  }

  async function handleSave() {
    setError("");
    setMessage("");
    const records = rows
      .filter((r) => r.status)
      .map((r) => ({ studentId: r.studentId, status: r.status }));
    if (records.length === 0) {
      setError("Mark at least one student before saving");
      return;
    }
    setSaving(true);
    try {
      const res = await api("/attendance", {
        method: "POST",
        body: { classId: Number(classId), date, records },
      });
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const shownError = error || classesError;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-800">Attendance</h1>

      {shownError && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{shownError}</div>
      )}
      {message && (
        <div className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="class">
            Class
          </label>
          <select
            id="class"
            value={classId}
            onChange={changeFilter(setClassId)}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">{classesLoading ? "Loading..." : "Choose a class"}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={changeFilter(setDate)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {!classesLoading && classes.length === 0 && (
        <p className="text-sm text-slate-500">
          No classes are assigned to you yet. Ask the admin to assign you to a class.
        </p>
      )}

      {ready && (
        <div className="rounded-lg bg-white shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <span className="text-sm text-slate-600">
              {loading
                ? "Loading..."
                : `${rows.length} student(s) · ${unmarked} not marked yet`}
            </span>
            <button
              onClick={markAllPresent}
              disabled={loading || rows.length === 0}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Mark all present
            </button>
          </div>

          {!loading && rows.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No active students in this class.
            </p>
          )}

          <ul>
            {rows.map((r) => (
              <li
                key={r.studentId}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 first:border-t-0"
              >
                <div>
                  <div className="font-medium text-slate-800">{r.name}</div>
                  <div className="text-xs text-slate-500">Roll no. {r.rollNumber}</div>
                </div>
                <div className="flex gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      aria-pressed={r.status === s.value}
                      onClick={() => setStatus(r.studentId, s.value)}
                      className={`rounded border px-2.5 py-1 text-xs font-medium ${
                        r.status === s.value
                          ? s.on
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          {rows.length > 0 && (
            <div className="flex justify-end border-t border-slate-100 px-4 py-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save attendance"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
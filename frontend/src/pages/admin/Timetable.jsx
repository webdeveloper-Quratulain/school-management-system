import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { api } from "../../api";
import Modal from "../../components/Modal";
import { useClasses } from "../../useClasses";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayName = (d) => d.charAt(0) + d.slice(1).toLowerCase();

const emptyForm = { classSubjectId: "", day: "MONDAY", startTime: "", endTime: "" };
const selectClass =
  "mb-4 w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-[#1a4033] focus:outline-none";
const inputClass =
  "mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-[#1a4033] focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function Timetable() {
  const { classes, loading: classesLoading, error: classesError } = useClasses();
  const [classId, setClassId] = useState("");
  const [sheet, setSheet] = useState({ classId: "", slots: [], options: [] });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const latest = useRef("");

  const load = useCallback(async (id) => {
    latest.current = id;
    try {
      const [slots, options] = await Promise.all([
        api(`/timetable/class/${id}`),
        api(`/class-subjects?classId=${id}`),
      ]);
      if (latest.current !== id) return;
      setSheet({ classId: id, slots, options });
      setError("");
    } catch (err) {
      if (latest.current !== id) return;
      setSheet({ classId: id, slots: [], options: [] });
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (classId) load(classId);
  }, [classId, load]);

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

  const loading = Boolean(classId) && sheet.classId !== classId;
  const slots = sheet.classId === classId ? sheet.slots : [];
  const options = sheet.classId === classId ? sheet.options : [];
  const days = DAYS.filter((d) => slots.some((s) => s.day === d));

  function handleClassChange(e) {
    setClassId(e.target.value);
    setError("");
    setMessage("");
  }

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setModal({});
  }

  function openEdit(slot) {
    setForm({
      classSubjectId: slot.classSubjectId,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
    setFormError("");
    setModal({ slot });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (form.startTime >= form.endTime) {
      setFormError("The start time must be earlier than the end time");
      return;
    }
    setSaving(true);
    try {
      if (modal.slot) {
        await api(`/timetable/${modal.slot.id}`, {
          method: "PUT",
          body: { day: form.day, startTime: form.startTime, endTime: form.endTime },
        });
        setMessage("Lesson updated");
      } else {
        await api("/timetable", {
          method: "POST",
          body: {
            classSubjectId: Number(form.classSubjectId),
            day: form.day,
            startTime: form.startTime,
            endTime: form.endTime,
          },
        });
        setMessage("Lesson added");
      }
      setModal(null);
      await load(classId);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slot) {
    const ok = window.confirm(
      `Remove ${slot.subject.name} on ${dayName(slot.day)} at ${slot.startTime}?`
    );
    if (!ok) return;
    setMessage("");
    try {
      await api(`/timetable/${slot.id}`, { method: "DELETE" });
      setMessage("Lesson removed");
      await load(classId);
    } catch (err) {
      setError(err.message);
    }
  }

  const shownError = error || classesError;

  return (
    <>
      <PageHeader title="Timetable" subtitle="Build the weekly lesson plan for each class.">
        <div className="flex flex-wrap items-center gap-3">
          {classId && !loading && (
            <span className="stat-chip stat-chip--present">
              <b>{slots.length}</b> {slots.length === 1 ? "lesson" : "lessons"}
            </span>
          )}
          {classId && (
            <button
              onClick={openCreate}
              className="rounded bg-[#1a4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#245a47]"
            >
              Add lesson
            </button>
          )}
        </div>
      </PageHeader>

      <div className="page-body">
        {shownError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {shownError}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </div>
        )}

        <div className="card mb-4 max-w-sm">
          <label className={labelClass} htmlFor="class">Class</label>
          <select
            id="class"
            value={classId}
            onChange={handleClassChange}
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

        {!classId && classes.length > 0 && (
          <EmptyState icon={CalendarDays} message="Choose a class to see or build its timetable." />
        )}

        {classId && loading && (
          <div className="rounded-lg bg-white px-4 py-6 text-center text-sm text-slate-500 shadow">
            Loading...
          </div>
        )}

        {classId && !loading && slots.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            message='No lessons yet. Click Add lesson to build this class&apos;s week. A subject must be assigned to the class first, under "Class setup".'
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {days.map((day) => (
            <div key={day} className="rounded-lg border border-slate-200 bg-white shadow">
              <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-[#1a4033]">
                {dayName(day)}
              </h2>
              <ul>
                {slots
                  .filter((s) => s.day === day)
                  .map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 first:border-t-0"
                    >
                      <div>
                        <div className="font-medium text-slate-800">{s.subject.name}</div>
                        <div className="text-xs text-slate-500">
                          {s.startTime} – {s.endTime} · {s.teacher ?? "No teacher"}
                        </div>
                      </div>
                      <div className="whitespace-nowrap text-sm">
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
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        {modal && (
          <Modal title={modal.slot ? "Edit lesson" : "Add lesson"} onClose={() => setModal(null)}>
            <form onSubmit={handleSubmit}>
              {formError && (
                <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {modal.slot ? (
                <div className="mb-4 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {modal.slot.subject.name}
                  {modal.slot.teacher ? ` · ${modal.slot.teacher}` : ""}
                </div>
              ) : (
                <>
                  <label className={labelClass} htmlFor="subject">Subject</label>
                  <select
                    id="subject"
                    value={form.classSubjectId}
                    onChange={(e) => setForm({ ...form, classSubjectId: e.target.value })}
                    required
                    className={selectClass}
                  >
                    <option value="">Choose a subject</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.subject.name}
                        {o.teacher ? ` — ${o.teacher.user.name}` : " (no teacher)"}
                      </option>
                    ))}
                  </select>
                  {options.length === 0 && (
                    <p className="-mt-2 mb-4 text-xs text-slate-500">
                      This class has no subjects yet. Add some under "Class setup".
                    </p>
                  )}
                </>
              )}

              <label className={labelClass} htmlFor="day">Day</label>
              <select
                id="day"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
                className={selectClass}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {dayName(d)}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="start">Starts</label>
                  <input
                    id="start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="end">Ends</label>
                  <input
                    id="end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

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
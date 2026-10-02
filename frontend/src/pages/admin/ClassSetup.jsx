import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { useClasses } from "../../useClasses";

const selectClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function ClassSetup() {
  const { classes, loading: classesLoading, error: classesError } = useClasses();
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classId, setClassId] = useState("");
  const [sheet, setSheet] = useState({ classId: "", items: [] });
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async (id) => {
    try {
      const items = await api(`/class-subjects?classId=${id}`);
      setSheet({ classId: id, items });
      setError("");
    } catch (err) {
      setSheet({ classId: id, items: [] });
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    Promise.all([api("/subjects"), api("/teachers")])
      .then(([s, t]) => {
        setSubjects(s);
        setTeachers(t.filter((x) => x.user.isActive));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (classId) loadItems(classId);
  }, [classId, loadItems]);

  const loading = Boolean(classId) && sheet.classId !== classId;
  const items = sheet.classId === classId ? sheet.items : [];
  const available = subjects.filter((s) => !items.some((i) => i.subjectId === s.id));

  function handleClassChange(e) {
    setClassId(e.target.value);
    setSubjectId("");
    setTeacherId("");
    setError("");
  }

  async function save(subjectIdValue, teacherIdValue) {
    await api("/class-subjects", {
      method: "POST",
      body: {
        classId: Number(classId),
        subjectId: Number(subjectIdValue),
        teacherId: teacherIdValue ? Number(teacherIdValue) : null,
      },
    });
    await loadItems(classId);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!subjectId) return;
    setSaving(true);
    setError("");
    try {
      await save(subjectId, teacherId);
      setSubjectId("");
      setTeacherId("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTeacherChange(item, value) {
    setError("");
    try {
      await save(item.subjectId, value);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(item) {
    const ok = window.confirm(
      `Remove ${item.subject.name} from this class?\n\nIts timetable lessons for this class are deleted too. This cannot be undone.`
    );
    if (!ok) return;
    try {
      await api(`/class-subjects/${item.id}`, { method: "DELETE" });
      await loadItems(classId);
    } catch (err) {
      setError(err.message);
    }
  }

  const shownError = error || classesError;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-800">Class setup</h1>
      <p className="mb-4 text-sm text-slate-600">
        Choose which subjects each class studies and which teacher teaches each one. Teachers can
        only take attendance and enter marks for the classes and subjects assigned here.
      </p>

      {shownError && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{shownError}</div>
      )}

      <div className="mb-4 max-w-sm">
        <label className={labelClass} htmlFor="class">Class</label>
        <select id="class" value={classId} onChange={handleClassChange} className={selectClass}>
          <option value="">{classesLoading ? "Loading..." : "Choose a class"}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.section}
            </option>
          ))}
        </select>
      </div>

      {classId && (
        <>
          <div className="mb-4 overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      No subjects assigned to this class yet.
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.subject.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.teacherId ?? ""}
                        onChange={(e) => handleTeacherChange(item, e.target.value)}
                        aria-label={`Teacher for ${item.subject.name}`}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                      >
                        <option value="">No teacher yet</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.user.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(item)}
                        className="text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow">
            <div className="min-w-44 flex-1">
              <label className={labelClass} htmlFor="subject">Add a subject</label>
              <select
                id="subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={selectClass}
              >
                <option value="">Choose a subject</option>
                {available.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-44 flex-1">
              <label className={labelClass} htmlFor="teacher">Teacher (optional)</label>
              <select
                id="teacher"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className={selectClass}
              >
                <option value="">No teacher yet</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving || !subjectId}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Adding..." : "Add"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
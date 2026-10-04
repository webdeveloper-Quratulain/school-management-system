import { useEffect, useState } from "react";
import { PenLine } from "lucide-react";
import { api } from "../../api";
import { useAuth } from "../../AuthContext";
import { useClasses } from "../../useClasses";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";

const selectClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1a4033] focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function Marks() {
  const { user } = useAuth();
  const { classes, loading: classesLoading, error: classesError } = useClasses();
  const [classId, setClassId] = useState("");
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [exams, setExams] = useState([]);
  const [adminSubjects, setAdminSubjects] = useState([]);
  const [totalMarks, setTotalMarks] = useState("100");
  const [sheet, setSheet] = useState({ key: "", rows: [] });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedClass = classes.find((c) => String(c.id) === classId);
  const subjects = user.role === "TEACHER" ? (selectedClass?.subjects ?? []) : adminSubjects;

  const ready = Boolean(classId && examId && subjectId);
  const key = `${classId}|${examId}|${subjectId}`;
  const loading = ready && sheet.key !== key;
  const rows = sheet.key === key ? sheet.rows : [];

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    api(`/exams?classId=${classId}`)
      .then((data) => {
        if (!cancelled) setExams(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  useEffect(() => {
    if (!classId || user.role !== "ADMIN") return;
    let cancelled = false;
    api(`/class-subjects?classId=${classId}`)
      .then((items) => {
        if (!cancelled) {
          setAdminSubjects(items.map((i) => ({ id: i.subject.id, name: i.subject.name })));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, user.role]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    Promise.all([
      api(`/students?classId=${classId}`),
      api(`/exams/${examId}/results?subjectId=${subjectId}`),
    ])
      .then(([students, results]) => {
        if (cancelled) return;
        const saved = new Map(results.map((r) => [r.studentId, r]));
        setSheet({
          key,
          rows: students
            .filter((s) => s.user.isActive)
            .map((s) => ({
              studentId: s.id,
              rollNumber: s.rollNumber,
              name: s.user.name,
              marks: saved.has(s.id) ? String(saved.get(s.id).marks) : "",
            })),
        });
        if (results.length > 0) setTotalMarks(String(results[0].totalMarks));
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
  }, [ready, key, classId, examId, subjectId]);

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

  function handleClassChange(e) {
    setClassId(e.target.value);
    setExamId("");
    setSubjectId("");
    setExams([]);
    setAdminSubjects([]);
    setMessage("");
    setError("");
  }

  function handleExamChange(e) {
    setExamId(e.target.value);
    setMessage("");
    setError("");
  }

  function handleSubjectChange(e) {
    setSubjectId(e.target.value);
    setMessage("");
    setError("");
  }

  function setMarks(studentId, value) {
    setMessage("");
    setSheet((s) => ({
      ...s,
      rows: s.rows.map((r) => (r.studentId === studentId ? { ...r, marks: value } : r)),
    }));
  }

  async function handleSave() {
    setError("");
    setMessage("");
    const total = Number(totalMarks);
    if (!(total > 0)) {
      setError("Total marks must be above 0");
      return;
    }
    const records = [];
    for (const r of rows) {
      if (r.marks.trim() === "") continue;
      const value = Number(r.marks);
      if (!Number.isFinite(value) || value < 0 || value > total) {
        setError(`Marks for ${r.name} must be a number from 0 to ${total}`);
        return;
      }
      records.push({ studentId: r.studentId, marks: value });
    }
    if (records.length === 0) {
      setError("Enter marks for at least one student");
      return;
    }
    setSaving(true);
    try {
      const res = await api(`/exams/${examId}/results`, {
        method: "POST",
        body: { subjectId: Number(subjectId), totalMarks: total, records },
      });
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const shownError = error || classesError;
  const enteredCount = rows.filter((r) => r.marks.trim() !== "").length;

  return (
    <>
      <PageHeader title="Enter marks" subtitle="Choose a class, exam and subject, then enter each student's marks.">
        {ready && !loading && rows.length > 0 && (
          <span className="stat-chip stat-chip--present">
            <b>{enteredCount}</b> of {rows.length} entered
          </span>
        )}
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

        <div className="card mb-4 grid gap-3 sm:grid-cols-3">
          <div>
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

          <div>
            <label className={labelClass} htmlFor="exam">Exam</label>
            <select
              id="exam"
              value={examId}
              onChange={handleExamChange}
              disabled={!classId}
              className={selectClass}
            >
              <option value="">Choose an exam</option>
              {exams.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.date.slice(0, 10)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="subject">Subject</label>
            <select
              id="subject"
              value={subjectId}
              onChange={handleSubjectChange}
              disabled={!classId}
              className={selectClass}
            >
              <option value="">Choose a subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {classId && subjects.length === 0 && user.role === "TEACHER" && (
          <p className="mb-4 text-sm text-slate-500">
            You don't teach a subject in this class, so you can't enter marks for it.
          </p>
        )}
        {classId && exams.length === 0 && (
          <p className="mb-4 text-sm text-slate-500">
            No exams have been created for this class yet.
          </p>
        )}
        {!classesLoading && classes.length === 0 && (
          <p className="text-sm text-slate-500">
            No classes are assigned to you yet. Ask the admin to assign you to a class.
          </p>
        )}

        {!ready && classes.length > 0 && (
          <EmptyState
            icon={PenLine}
            message="Choose a class, an exam and a subject to enter marks."
          />
        )}

        {ready && (
          <div className="rounded-lg border border-slate-200 bg-white shadow">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <span className="text-sm text-slate-600">
                {loading ? "Loading..." : `${rows.length} student(s)`}
              </span>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                Total marks
                <input
                  type="number"
                  min="1"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  className="w-24 rounded border border-slate-300 px-2 py-1 focus:border-[#1a4033] focus:outline-none"
                />
              </label>
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
                  className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0"
                >
                  <div>
                    <div className="font-medium text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-500">Roll no. {r.rollNumber}</div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={r.marks}
                    onChange={(e) => setMarks(r.studentId, e.target.value)}
                    aria-label={`Marks for ${r.name}`}
                    className={`w-24 rounded border px-2 py-1 text-right focus:border-[#1a4033] focus:outline-none ${
  r.marks.trim() !== "" ? "border-green-300 bg-green-50" : "border-slate-300"
}`}
                  />
                </li>
              ))}
            </ul>

            {rows.length > 0 && (
              <div className="sticky bottom-0 flex justify-end rounded-b-lg border-t border-slate-100 bg-white px-4 py-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded bg-[#1a4033] px-5 py-2 text-sm font-medium text-white hover:bg-[#245a47] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save marks"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
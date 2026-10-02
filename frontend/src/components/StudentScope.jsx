import { useState } from "react";
import { useApi } from "../useApi";

export default function StudentScope({ title, children }) {
  const { data: students, loading, error } = useApi("/students/mine");
  const [chosen, setChosen] = useState("");

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) {
    return <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }
  if (!students || students.length === 0) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500">
          No student is linked to your account yet. Please contact the school office.
        </p>
      </div>
    );
  }

  const student = students.find((s) => String(s.id) === chosen) ?? students[0];
  const classLabel = student.class
    ? `${student.class.name} ${student.class.section}`
    : "No class yet";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500">
            {student.name} · {classLabel} · Roll no. {student.rollNumber}
          </p>
        </div>
        {students.length > 1 && (
          <select
            value={String(student.id)}
            onChange={(e) => setChosen(e.target.value)}
            aria-label="Choose a child"
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {children(student)}
    </div>
  );
}
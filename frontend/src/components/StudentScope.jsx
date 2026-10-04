import { useState } from "react";
import { useApi } from "../useApi";
import PageHeader from "./PageHeader";

export default function StudentScope({ title, children }) {
  const { data: students, loading, error } = useApi("/students/mine");
  const [chosen, setChosen] = useState("");

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!students || students.length === 0) {
    return (
      <>
        <PageHeader title={title} />
        <div className="page-body">
          <p className="text-sm text-slate-500">
            No student is linked to your account yet. Please contact the school office.
          </p>
        </div>
      </>
    );
  }

  const student = students.find((s) => String(s.id) === chosen) ?? students[0];
  const classLabel = student.class
    ? `${student.class.name} ${student.class.section}`
    : "No class yet";

  return (
    <>
      <PageHeader
        title={title}
        subtitle={`${student.name} · ${classLabel} · Roll no. ${student.rollNumber}`}
      >
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
      </PageHeader>

      <div className="page-body">{children(student)}</div>
    </>
  );
}
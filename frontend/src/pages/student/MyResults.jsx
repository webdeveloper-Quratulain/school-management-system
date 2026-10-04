import { Award } from "lucide-react";
import StudentScope from "../../components/StudentScope";
import EmptyState from "../../components/EmptyState";
import { useApi } from "../../useApi";

function View({ student }) {
  const { data, loading, error } = useApi(`/exams/student/${student.id}`);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!data || data.length === 0) {
    return <EmptyState icon={Award} message="No results have been entered yet." />;
  }

  return (
    <div>
      {data.map((exam) => (
        <div
          key={exam.examId}
          className="mb-4 rounded-lg border border-slate-200 bg-white shadow"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="font-semibold text-[#1a4033]">{exam.exam}</h2>
              <p className="text-xs text-slate-500">{exam.date.slice(0, 10)}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span>
                {exam.totalObtained} / {exam.totalMax} · {exam.percentage}%
              </span>
              <span className="rounded-full bg-[#e3efe9] px-2.5 py-0.5 text-xs font-semibold text-[#1a4033]">
                Grade {exam.grade}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Marks</th>
                  <th className="px-4 py-2">Percentage</th>
                  <th className="px-4 py-2">Grade</th>
                </tr>
              </thead>
              <tbody>
                {exam.subjects.map((s) => (
                  <tr key={s.subject} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{s.subject}</td>
                    <td className="px-4 py-2">
                      {s.marks} / {s.totalMarks}
                    </td>
                    <td className="px-4 py-2">{s.percentage}%</td>
                    <td className="px-4 py-2">{s.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyResults() {
  return <StudentScope title="Results">{(student) => <View student={student} />}</StudentScope>;
}
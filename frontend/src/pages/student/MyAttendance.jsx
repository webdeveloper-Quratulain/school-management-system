import StudentScope from "../../components/StudentScope";
import { useApi } from "../../useApi";

const STATUS_STYLE = {
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  LATE: "bg-amber-100 text-amber-700",
  LEAVE: "bg-sky-100 text-sky-700",
};
const label = (s) => s.charAt(0) + s.slice(1).toLowerCase();

function View({ student }) {
  const { data, loading, error } = useApi(`/attendance/student/${student.id}`);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) {
    return <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }

  const { summary, records } = data;
  const cards = [
    ["Attendance", summary.percentage === null ? "—" : `${summary.percentage}%`],
    ["Present", summary.present],
    ["Absent", summary.absent],
    ["Late", summary.late],
    ["Leave", summary.leave],
  ];

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([name, value]) => (
          <div key={name} className="rounded-lg bg-white p-4 shadow">
            <div className="text-xs text-slate-500">{name}</div>
            <div className="text-2xl font-semibold text-slate-800">{value}</div>
          </div>
        ))}
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Present and late days both count as attended. Out of {summary.total} day(s) recorded.
      </p>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Remark</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No attendance has been recorded yet.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.date} className="border-t border-slate-100">
                <td className="px-4 py-3">{r.date.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}
                  >
                    {label(r.status)}
                  </span>
                </td>
                <td className="px-4 py-3">{r.remark || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MyAttendance() {
  return <StudentScope title="Attendance">{(student) => <View student={student} />}</StudentScope>;
}
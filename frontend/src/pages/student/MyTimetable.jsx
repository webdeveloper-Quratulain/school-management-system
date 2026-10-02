import StudentScope from "../../components/StudentScope";
import { useApi } from "../../useApi";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayName = (d) => d.charAt(0) + d.slice(1).toLowerCase();

function View({ student }) {
  const { data, loading, error } = useApi(
    student.classId ? `/timetable/class/${student.classId}` : null
  );

  if (!student.classId) {
    return <p className="text-sm text-slate-500">{student.name} is not in a class yet.</p>;
  }
  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) {
    return <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-500">No timetable has been set for this class yet.</p>;
  }

  const days = DAYS.filter((d) => data.some((s) => s.day === d));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {days.map((day) => (
        <div key={day} className="rounded-lg bg-white shadow">
          <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">
            {dayName(day)}
          </h2>
          <ul>
            {data
              .filter((s) => s.day === day)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0"
                >
                  <div>
                    <div className="font-medium text-slate-800">{s.subject.name}</div>
                    <div className="text-xs text-slate-500">
                      {s.teacher ?? "Teacher not assigned"}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-sm text-slate-600">
                    {s.startTime} – {s.endTime}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function MyTimetable() {
  return <StudentScope title="Timetable">{(student) => <View student={student} />}</StudentScope>;
}
import { useApi } from "../../useApi";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayName = (d) => d.charAt(0) + d.slice(1).toLowerCase();

export default function MySchedule() {
  const { data, loading, error } = useApi("/timetable/me");

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-800">My timetable</h1>

      {loading && <p className="text-slate-500">Loading...</p>}
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-slate-500">
          No lessons have been scheduled for you yet.
        </p>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {DAYS.filter((d) => data.some((s) => s.day === d)).map((day) => (
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
                          {s.class.name} {s.class.section}
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
      )}
    </div>
  );
}
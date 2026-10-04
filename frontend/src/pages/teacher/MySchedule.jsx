import { CalendarDays } from "lucide-react";
import { useApi } from "../../useApi";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayName = (d) => d.charAt(0) + d.slice(1).toLowerCase();

export default function MySchedule() {
  const { data, loading, error } = useApi("/timetable/me");

  return (
    <>
      <PageHeader title="My timetable" subtitle="Your lessons for the week.">
        {data && data.length > 0 && (
          <span className="stat-chip stat-chip--present">
            <b>{data.length}</b> {data.length === 1 ? "lesson" : "lessons"} a week
          </span>
        )}
      </PageHeader>

      <div className="page-body">
        {loading && (
          <div className="rounded-lg bg-white px-4 py-6 text-center text-sm text-slate-500 shadow">
            Loading...
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {data && data.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            message="No lessons have been scheduled for you yet."
          />
        )}

        {data && data.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {DAYS.filter((d) => data.some((s) => s.day === d)).map((day) => (
              <div key={day} className="rounded-lg border border-slate-200 bg-white shadow">
                <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-[#1a4033]">
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
    </>
  );
}
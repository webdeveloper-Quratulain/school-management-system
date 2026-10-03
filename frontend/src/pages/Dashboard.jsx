import { Link } from "react-router";
import { useAuth } from "../AuthContext";
import { useApi } from "../useApi";

const today = () => new Date().toLocaleDateString("en-CA");
const money = (n) => Number(n).toFixed(2);
const when = (iso) =>
  new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

function Stat({ label, value, tone = "text-slate-800" }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function Panel({ title, link, linkLabel, children }) {
  return (
    <div className="rounded-lg bg-white shadow">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {link && (
          <Link to={link} className="text-sm text-indigo-600 hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Lessons({ items, showTeacher, showClass }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No lessons today.</p>;
  }
  return (
    <ul>
      {items.map((l) => (
        <li
          key={l.id}
          className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 first:border-t-0"
        >
          <div>
            <div className="text-sm font-medium text-slate-800">{l.subject}</div>
            <div className="text-xs text-slate-500">
              {showClass && l.class}
              {showTeacher && (l.teacher ?? "Teacher not assigned")}
            </div>
          </div>
          <div className="whitespace-nowrap text-sm text-slate-600">
            {l.startTime} – {l.endTime}
          </div>
        </li>
      ))}
    </ul>
  );
}

function RecentAnnouncements({ items }) {
  return (
    <Panel title="Latest announcements" link="/announcements" linkLabel="See all">
      {items.length === 0 && <p className="text-sm text-slate-500">No announcements yet.</p>}
      <ul>
        {items.map((a) => (
          <li key={a.id} className="border-t border-slate-100 py-2 first:border-t-0">
            <div className="text-sm font-medium text-slate-800">{a.title}</div>
            <p className="line-clamp-2 text-xs text-slate-600">{a.message}</p>
            <div className="mt-0.5 text-xs text-slate-400">
              {a.createdBy.name} · {when(a.createdAt)}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AdminView({ d }) {
  const a = d.attendanceToday;
  const rows = [
    ["Present", a.PRESENT, "text-green-700"],
    ["Absent", a.ABSENT, "text-red-700"],
    ["Late", a.LATE, "text-amber-600"],
    ["Leave", a.LEAVE, "text-sky-700"],
  ];
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Students" value={d.counts.students} />
        <Stat label="Teachers" value={d.counts.teachers} />
        <Stat label="Parents" value={d.counts.parents} />
        <Stat label="Classes" value={d.counts.classes} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Attendance today" link="/attendance" linkLabel="Open">
          <p className="mb-3 text-sm text-slate-600">
            {a.marked} of {a.enrolled} students marked
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {rows.map(([name, value, tone]) => (
              <div key={name}>
                <div className={`text-xl font-semibold ${tone}`}>{value}</div>
                <div className="text-xs text-slate-500">{name}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Fees" link="/fees" linkLabel="Manage">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Total billed</dt>
              <dd className="font-medium">{money(d.fees.billed)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Collected</dt>
              <dd className="font-medium text-green-700">{money(d.fees.collected)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Outstanding</dt>
              <dd className="font-medium text-red-700">{money(d.fees.outstanding)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Overdue fees</dt>
              <dd className="font-medium">{d.fees.overdueCount}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <RecentAnnouncements items={d.announcements} />
    </>
  );
}

function TeacherView({ d }) {
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Your classes" value={d.classCount} />
        <Stat label="Lessons today" value={d.lessonsToday.length} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Today's lessons" link="/my-schedule" linkLabel="Full timetable">
          <Lessons items={d.lessonsToday} showClass />
        </Panel>

        <Panel title="Attendance in your classes" link="/attendance" linkLabel="Take attendance">
          {d.headClasses.length === 0 && (
            <p className="text-sm text-slate-500">You are not the class teacher of any class.</p>
          )}
          <ul>
            {d.headClasses.map((c) => {
              const done = c.students > 0 && c.marked >= c.students;
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 first:border-t-0"
                >
                  <span className="text-sm font-medium text-slate-800">{c.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {c.marked} of {c.students} marked
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <RecentAnnouncements items={d.announcements} />
    </>
  );
}

function FamilyView({ d }) {
  if (d.children.length === 0) {
    return (
      <p className="mb-4 text-sm text-slate-500">
        No student is linked to your account yet. Please contact the school office.
      </p>
    );
  }
  return (
    <>
      {d.children.map((c) => (
        <div key={c.id} className="mb-4 rounded-lg bg-white shadow">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-800">{c.name}</h2>
            <p className="text-xs text-slate-500">{c.className ?? "No class yet"}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-3">
            <Stat
              label={`Attendance${c.attendanceDays ? ` (${c.attendanceDays} days)` : ""}`}
              value={c.attendancePercentage === null ? "—" : `${c.attendancePercentage}%`}
            />
            <Stat
              label="Fee balance"
              value={money(c.feeBalance)}
              tone={c.feeBalance > 0 ? "text-red-700" : "text-green-700"}
            />
            <Stat
              label="Overdue fees"
              value={c.overdueFees}
              tone={c.overdueFees > 0 ? "text-red-700" : "text-slate-800"}
            />
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">Today's lessons</h3>
            <Lessons items={c.lessonsToday} showTeacher />
          </div>
        </div>
      ))}

      <RecentAnnouncements items={d.announcements} />
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi(`/dashboard?date=${today()}`);
  const dayName = new Date().toLocaleDateString([], { weekday: "long" });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user.name}</h1>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        {dayName}, {when(new Date().toISOString())}
      </p>

      {loading && <p className="text-slate-500">Loading...</p>}
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {data && user.role === "ADMIN" && <AdminView d={data} />}
      {data && user.role === "TEACHER" && <TeacherView d={data} />}
      {data && (user.role === "STUDENT" || user.role === "PARENT") && <FamilyView d={data} />}
    </div>
  );
}
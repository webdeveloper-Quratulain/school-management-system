import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import {
  Award,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PenLine,
  Presentation,
  School,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import NotificationBell from "./NotificationBell";

const ALL = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ALL, end: true },
  { to: "/announcements", label: "Announcements", icon: Megaphone, roles: ALL },

  { group: "Daily work", to: "/my-schedule", label: "My timetable", icon: CalendarDays, roles: ["TEACHER"] },
  { group: "Daily work", to: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ["ADMIN", "TEACHER"] },
  { group: "Daily work", to: "/marks", label: "Marks", icon: PenLine, roles: ["ADMIN", "TEACHER"] },

  { group: "My school", to: "/my-timetable", label: "Timetable", icon: CalendarDays, roles: ["STUDENT", "PARENT"] },
  { group: "My school", to: "/my-attendance", label: "Attendance", icon: CalendarCheck, roles: ["STUDENT", "PARENT"] },
  { group: "My school", to: "/my-results", label: "Results", icon: Award, roles: ["STUDENT", "PARENT"] },
  { group: "My school", to: "/my-fees", label: "Fees", icon: Wallet, roles: ["STUDENT", "PARENT"] },

  { group: "People", to: "/teachers", label: "Teachers", icon: Presentation, roles: ["ADMIN"] },
  { group: "People", to: "/parents", label: "Parents", icon: Users, roles: ["ADMIN"] },
  { group: "People", to: "/students", label: "Students", icon: GraduationCap, roles: ["ADMIN"] },

  { group: "School", to: "/classes", label: "Classes", icon: School, roles: ["ADMIN"] },
  { group: "School", to: "/class-setup", label: "Class setup", icon: Layers, roles: ["ADMIN"] },
  { group: "School", to: "/subjects", label: "Subjects", icon: BookOpen, roles: ["ADMIN"] },
  { group: "School", to: "/timetable", label: "Timetable", icon: CalendarDays, roles: ["ADMIN"] },
  { group: "School", to: "/exams", label: "Exams", icon: ClipboardList, roles: ["ADMIN"] },

  { group: "Money", to: "/fees", label: "Fees", icon: Wallet, roles: ["ADMIN"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((item) => item.roles.includes(user.role));

  const sections = [];
  for (const item of items) {
    const name = item.group ?? "";
    const last = sections[sections.length - 1];
    if (last && last.name === name) last.items.push(item);
    else sections.push({ name, items: [item] });
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-paper md:flex">
      <header className="flex items-center justify-between bg-indigo-800 px-4 py-3 text-white md:hidden">
        <span className="flex items-center gap-2 font-display font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pencil text-indigo-900">
            <BookOpen size={18} aria-hidden="true" />
          </span>
          School Management
        </span>
        <button
          onClick={() => setOpen(!open)}
          className="rounded p-1.5 hover:bg-white/10"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </header>

      <aside
        className={`${open ? "block" : "hidden"} w-full bg-indigo-800 text-white md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto`}
      >
        <div className="hidden items-center gap-3 px-5 py-5 md:flex">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pencil text-indigo-900">
            <BookOpen size={20} aria-hidden="true" />
          </span>
          <span className="font-display text-base font-semibold leading-tight">School Management</span>
        </div>

        <nav className="px-3 pb-6">
          {sections.map((section) => (
            <div key={section.name || "main"}>
              {section.name && (
                <p className="px-3 pb-1 pt-5 text-xs font-medium text-indigo-200/80">
                  {section.name}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-white/15 text-white"
                            : "text-indigo-100 hover:bg-white/10 hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={18} aria-hidden="true" />
                          <span>{item.label}</span>
                          {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-pencil" />}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6">
          <NotificationBell />
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-800">
              {initials}
            </span>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-medium text-slate-800">{user.name}</div>
              <div className="text-xs text-slate-500">{roleLabel}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>

        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
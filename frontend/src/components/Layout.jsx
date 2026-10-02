import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"], end: true },
  { to: "/classes", label: "Classes", roles: ["ADMIN"] },
  { to: "/subjects", label: "Subjects", roles: ["ADMIN"] },
  { to: "/teachers", label: "Teachers", roles: ["ADMIN"] },
  { to: "/parents", label: "Parents", roles: ["ADMIN"] },
  { to: "/students", label: "Students", roles: ["ADMIN"] },
  { to: "/attendance", label: "Attendance", roles: ["ADMIN", "TEACHER"] },
  { to: "/marks", label: "Marks", roles: ["ADMIN", "TEACHER"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((item) => item.roles.includes(user.role));

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <header className="flex items-center justify-between bg-indigo-700 px-4 py-3 text-white md:hidden">
        <span className="font-semibold">School Management</span>
        <button
          onClick={() => setOpen(!open)}
          className="rounded px-2 py-1 hover:bg-indigo-600"
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </header>

      <aside
        className={`${open ? "block" : "hidden"} w-full bg-indigo-700 text-white md:block md:min-h-screen md:w-60`}
      >
        <div className="hidden px-5 py-5 text-lg font-semibold md:block">School Management</div>
        <nav className="space-y-1 px-3 pb-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${isActive ? "bg-indigo-900" : "hover:bg-indigo-600"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-end gap-4 bg-white px-6 py-3 shadow-sm">
          <span className="text-sm text-slate-600">
            {user.name} · {user.role}
          </span>
          <button
            onClick={handleLogout}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            Log out
          </button>
        </div>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
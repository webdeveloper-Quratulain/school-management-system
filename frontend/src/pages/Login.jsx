import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { BookOpen } from "lucide-react";
import { useAuth } from "../AuthContext";

const RULED_LINES = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(255,255,255,0.08) 31px, rgba(255,255,255,0.08) 32px)",
};

const WHO = [
  ["Administrators", "run classes, timetables, exams and fees."],
  ["Teachers", "take attendance and enter marks in a few taps."],
  ["Parents and students", "check attendance, results and fees at any time."],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <aside
        className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-indigo-800 py-12 text-white lg:flex"
        style={RULED_LINES}
      >
        <div className="absolute inset-y-0 left-20 w-px bg-pencil/60" aria-hidden="true" />

        <div className="relative flex items-center gap-3 pl-28">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pencil text-indigo-900">
            <BookOpen size={22} aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-semibold">School Management</span>
        </div>

        <div className="relative pl-28 pr-12">
          <p className="max-w-md font-display text-4xl font-semibold leading-tight">
            Attendance, results and fees, all in one place.
          </p>
          <dl className="mt-8 max-w-md space-y-4">
            {WHO.map(([who, what]) => (
              <div key={who}>
                <dt className="font-medium text-pencil">{who}</dt>
                <dd className="text-indigo-100">{what}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative pl-28 text-sm text-indigo-200">
          Sign in with the account your school gave you.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-800 text-pencil">
              <BookOpen size={22} aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-semibold text-slate-800">
              School Management
            </span>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
            <p className="mb-6 mt-1 text-sm text-slate-500">Enter your email and password.</p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />

            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mb-6 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-700 py-2.5 font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
import { useAuth } from "../AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user.name}</h1>
      <p className="mt-1 text-slate-600">You are logged in as {user.role}.</p>
    </div>
  );
}
import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Classes from "./pages/admin/Classes";
import Subjects from "./pages/admin/Subjects";
import Teachers from "./pages/admin/Teachers";
import Parents from "./pages/admin/Parents";
import Students from "./pages/admin/Students";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="classes" element={<Classes />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="parents" element={<Parents />} />
            <Route path="students" element={<Students />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
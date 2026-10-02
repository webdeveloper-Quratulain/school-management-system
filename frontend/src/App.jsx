import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Classes from "./pages/admin/Classes";
import ClassSetup from "./pages/admin/ClassSetup";
import Exams from "./pages/admin/Exams";
import Subjects from "./pages/admin/Subjects";
import Teachers from "./pages/admin/Teachers";
import Parents from "./pages/admin/Parents";
import Students from "./pages/admin/Students";
import Attendance from "./pages/teacher/Attendance";
import Marks from "./pages/teacher/Marks";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="classes" element={<Classes />} />
            <Route path="class-setup" element={<ClassSetup />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="parents" element={<Parents />} />
            <Route path="students" element={<Students />} />
            <Route path="exams" element={<Exams />} />
          </Route>
          <Route element={<ProtectedRoute roles={["ADMIN", "TEACHER"]} />}>
            <Route path="attendance" element={<Attendance />} />
            <Route path="marks" element={<Marks />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
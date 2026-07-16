/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireRole from './components/RequireRole';
import Home from './pages/Home';
import Login from './pages/Login';
import StudentCard from './pages/StudentCard';
import SelectClass from './pages/teacher/SelectClass';
import ClassAttendance from './pages/teacher/ClassAttendance';
import TeacherRecap from './pages/teacher/Recap';
import AdminDashboard from './pages/admin/Dashboard';
import ManageTeachers from './pages/admin/Teachers';
import ManageClasses from './pages/admin/Classes';
import ManageStudents from './pages/admin/Students';
import ManageParents from './pages/admin/Parents';
import AdminRecap from './pages/admin/Recap';
import PrintCards from './pages/admin/PrintCards';
import ChildRecap from './pages/parent/ChildRecap';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/student" element={<StudentCard />} />

          {/* Guru */}
          <Route
            path="/teacher"
            element={
              <RequireRole role="teacher">
                <SelectClass />
              </RequireRole>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <RequireRole role="teacher">
                <ClassAttendance />
              </RequireRole>
            }
          />
          <Route
            path="/teacher/recap"
            element={
              <RequireRole role="teacher">
                <TeacherRecap />
              </RequireRole>
            }
          />

          {/* Orang tua */}
          <Route
            path="/parent"
            element={
              <RequireRole role="parent">
                <ChildRecap />
              </RequireRole>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <RequireRole role="admin">
                <ManageTeachers />
              </RequireRole>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <RequireRole role="admin">
                <ManageClasses />
              </RequireRole>
            }
          />
          <Route
            path="/admin/students"
            element={
              <RequireRole role="admin">
                <ManageStudents />
              </RequireRole>
            }
          />
          <Route
            path="/admin/parents"
            element={
              <RequireRole role="admin">
                <ManageParents />
              </RequireRole>
            }
          />
          <Route
            path="/admin/recap"
            element={
              <RequireRole role="admin">
                <AdminRecap />
              </RequireRole>
            }
          />
          <Route
            path="/admin/print"
            element={
              <RequireRole role="admin">
                <PrintCards />
              </RequireRole>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

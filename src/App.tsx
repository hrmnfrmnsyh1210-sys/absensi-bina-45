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
import AdminDashboard from './pages/admin/Dashboard';
import ManageTeachers from './pages/admin/Teachers';
import PrintCards from './pages/admin/PrintCards';

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

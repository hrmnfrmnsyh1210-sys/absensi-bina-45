import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

/** Membungkus rute yang butuh login; redirect ke /login bila tidak sesuai. */
export default function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.role !== role) {
    // Sudah login tapi role salah → arahkan ke beranda role-nya.
    return <Navigate to={user.role === 'admin' ? '/admin' : '/teacher'} replace />;
  }
  return <>{children}</>;
}

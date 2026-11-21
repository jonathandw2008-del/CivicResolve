import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ComplaintProvider } from './context/ComplaintContext';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { CitizenLayout } from './layouts/CitizenLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { DepartmentLayout } from './layouts/DepartmentLayout';
import { ProtectedRoute } from './layouts/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Citizen Pages
import { CitizenDashboardPage } from './pages/citizen/CitizenDashboardPage';
import { ReportIssuePage } from './pages/citizen/ReportIssuePage';
import { MyComplaintsPage } from './pages/citizen/MyComplaintsPage';
import { ComplaintDetailPage } from './pages/citizen/ComplaintDetailPage';

// Department Officer Pages
import { DepartmentDashboardPage } from './pages/department/DepartmentDashboardPage';
import { DepartmentComplaintsPage } from './pages/department/DepartmentComplaintsPage';
import { DepartmentComplaintDetailPage } from './pages/department/DepartmentComplaintDetailPage';
import { DepartmentTeamPage } from './pages/department/DepartmentTeamPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminComplaintsPage } from './pages/admin/AdminComplaintsPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminDepartmentsPage } from './pages/admin/AdminDepartmentsPage';

// 404
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ComplaintProvider>
          <Routes>
            {/* Public Entry & Auth */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Citizen Protected Routes */}
            <Route
              path="/citizen"
              element={
                <ProtectedRoute requiredRole="citizen">
                  <CitizenLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/citizen/dashboard" replace />} />
              <Route path="dashboard" element={<CitizenDashboardPage />} />
              <Route path="report" element={<ReportIssuePage />} />
              <Route path="complaints" element={<MyComplaintsPage />} />
              <Route path="complaints/:id" element={<ComplaintDetailPage />} />
            </Route>

            {/* Department Officer Protected Routes */}
            <Route
              path="/department"
              element={
                <ProtectedRoute requiredRole="officer">
                  <DepartmentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/department/dashboard" replace />} />
              <Route path="dashboard" element={<DepartmentDashboardPage />} />
              <Route path="complaints" element={<DepartmentComplaintsPage />} />
              <Route path="complaints/:id" element={<DepartmentComplaintDetailPage />} />
              <Route path="team" element={<DepartmentTeamPage />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="complaints" element={<AdminComplaintsPage />} />
              <Route path="departments" element={<AdminDepartmentsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
            </Route>

            {/* Catch All 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ComplaintProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

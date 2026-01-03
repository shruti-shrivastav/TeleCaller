// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import Login from './pages/login-page';
import { ProtectedRoute } from './providers/protected-route';
import { DashboardLayout } from './components/dashboard-layout';
import UsersPage from './pages/users-page';
import { DashboardPage } from './pages/dashboard-page';
import LeadsPage from './pages/leads-page';
import TelecallersPage from './pages/telecallers-page';
import LeadersPage from './pages/leaders-page';
import TeamPage from './pages/team-page';
import { CallLogsPage } from './pages/call-logs-page';
import WebEnquiriesPage from './pages/web-enquiries-page';
// import UsersPage from './pages/users-page' // (you’ll add this soon)

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Protected routes with sidebar */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/users" element={<UsersPage />} />
        <Route
          path="/leads"
          element={
            <ProtectedRoute>
              <LeadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/telecallers"
          element={
            <ProtectedRoute>
              <TelecallersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaders"
          element={
            <ProtectedRoute>
              <LeadersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <TeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calls"
          element={
            <ProtectedRoute>
              <CallLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/web-enquiries"
          element={
            <ProtectedRoute>
              <WebEnquiriesPage />
            </ProtectedRoute>
          }
        />
        {/* Add more pages here like /leads, /profile, etc. */}
      </Route>
    </Routes>
  );
}

export default App;

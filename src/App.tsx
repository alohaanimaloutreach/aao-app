import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import AnimalsPage from './pages/AnimalsPage';
import AnimalProfilePage from './pages/AnimalProfilePage';
import PeoplePage from './pages/PeoplePage';
import PersonProfilePage from './pages/PersonProfilePage';
import LocationsPage from './pages/LocationsPage';
import LocationProfilePage from './pages/LocationProfilePage';
import OutreachPage from './pages/OutreachPage';
import ActiveEventPage from './pages/ActiveEventPage';
import EventSummaryPage from './pages/EventSummaryPage';
import NotesPage from './pages/NotesPage';
import FlagsPage from './pages/FlagsPage';
import ReportsPage from './pages/ReportsPage';
import AdminUsersPage from './pages/AdminUsersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/animals" element={<AnimalsPage />} />
            <Route path="/animals/:id" element={<AnimalProfilePage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/people/:id" element={<PersonProfilePage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/locations/:id" element={<LocationProfilePage />} />
            <Route path="/outreach" element={<OutreachPage />} />
            <Route path="/outreach/event/:id" element={<ActiveEventPage />} />
            <Route path="/outreach/summary/:id" element={<EventSummaryPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/flags" element={<FlagsPage />} />
            <Route
              path="/reports"
              element={
                <ProtectedRoute requireAdmin>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

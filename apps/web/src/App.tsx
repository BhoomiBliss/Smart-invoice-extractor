import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages imports
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';

// ------------------------------------------------------------------------------
// Route guards
// ------------------------------------------------------------------------------
const UserProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const auth = useContext(AuthContext);

  if (auth?.loading) {
    return <div className="min-h-screen bg-surface-950 flex items-center justify-center text-sm text-slate-500">Initializing session...</div>;
  }

  // Allow bypass for Guest sessions
  const isGuest = window.location.search.includes('session=guest');

  if (!auth?.user && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const auth = useContext(AuthContext);

  if (auth?.loading) {
    return <div className="min-h-screen bg-surface-950 flex items-center justify-center text-sm text-slate-500">Initializing session...</div>;
  }

  if (!auth?.user) {
    return <Navigate to="/login" replace />;
  }

  const hasAdminPerms = ['admin', 'manager', 'viewer'].includes(auth.user.role);
  if (!hasAdminPerms) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<SignIn />} />
            <Route path="/register" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Accountant workspace route */}
            <Route
              path="/dashboard"
              element={
                <UserProtectedRoute>
                  <UserDashboard />
                </UserProtectedRoute>
              }
            />

            {/* Admin Console Route */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/:tab"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

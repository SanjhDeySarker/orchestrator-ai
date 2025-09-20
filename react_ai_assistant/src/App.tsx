// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { SignIn } from '@/components/auth/SignIn';
import { SignUp } from '@/components/auth/SignUp';
import { AuthenticatedApp } from '@/components/authenticated-app';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/providers/theme-provider';
import 'stream-chat-react/dist/css/v2/index.css';

function AppRoutes() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/chat/:channelId?" element={<AuthenticatedApp user={user} onLogout={logout} />} />
      <Route path="/" element={<AuthenticatedApp user={user} onLogout={logout} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div className="h-screen bg-background">
          <AppRoutes />
          <Toaster />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}

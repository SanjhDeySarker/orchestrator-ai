import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  user: any; // You can replace any with your User type
  children: React.ReactNode;
}

export default function ProtectedRoute({ user, children }: ProtectedRouteProps) {
  if (!user) {
    // If not signed in → redirect to /signin
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}
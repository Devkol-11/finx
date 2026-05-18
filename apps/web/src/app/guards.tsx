import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

export function ProtectedRoute() {
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();
  if (!token) return <Navigate to="/auth/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const token = useAppSelector((state) => state.auth.token);
  if (token) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}

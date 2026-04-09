import { useAdminMe } from "@frontend/apis/adminAuth";
import { Navigate, Outlet } from "react-router-dom";
import { CustomLoader } from "./CustomLoader";

export function AuthGuard() {
  const { data, isLoading, isError } = useAdminMe();
  // Show loader while checking
  if (isLoading) {
    return <CustomLoader fullPage={true} />;
  }

  // // ❌ Not authenticated → redirect
  if (isError || data === null) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Authenticated → render app
  return <Outlet />;
}

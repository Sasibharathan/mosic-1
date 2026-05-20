// src/hooks/usePermissions.ts
import { useAuth } from "../context/AuthContext";

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.profile ?? "user";

  return {
    canCreate: role === "user" ||role === "superuser" || role === "admin",
    canEdit:   role === "superuser" || role === "admin",
    canDelete: role === "admin",
    role,
  };
}
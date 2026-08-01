import React from "react";
import Base from "../components/Base";
import RolePermissionManagement from "../components/accounts/RolePermissionManagement";

export default function RolesPage() {
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  return (
    <Base title="">
      <RolePermissionManagement baseApi={BASE_API} />
    </Base>
  );
}

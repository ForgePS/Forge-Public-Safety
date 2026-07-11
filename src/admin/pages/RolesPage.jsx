import { useState, useEffect } from "react";
import { DEFAULT_ROLES } from "../../cms/core/constants.js";
import { getLocalStore } from "../../cms/store/localStore.js";
import AdminPageHeader, { AdminCard } from "../components/AdminPageHeader.jsx";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const store = getLocalStore();
    setRoles(store.roles?.length ? store.roles : DEFAULT_ROLES);
    setUsers(store.users || []);
  }, []);

  return (
    <div className="p-8">
      <AdminPageHeader title="Roles & Permissions" description="Manage user roles and access control for the CMS." />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AdminCard title="Roles">
          <div className="space-y-3">
            {roles.map((role) => (
              <div key={role.id} className="p-4 rounded-xl border border-[#1E293B]">
                <p className="font-bold text-white">{role.name}</p>
                <p className="text-xs text-[#64748B] mt-1">{role.id}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {role.permissions.map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-[#1E293B] text-[#94A3B8]">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
        <AdminCard title="Users">
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border border-[#1E293B]">
                <div>
                  <p className="font-medium text-white">{user.name || user.email}</p>
                  <p className="text-xs text-[#64748B]">{user.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#F97316]/15 text-[#F97316]">{user.role}</span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

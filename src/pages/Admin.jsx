import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FaEye, FaPlus, FaSyncAlt, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  password: "",
  role_id: "",
};

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

function Admin() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [viewUser, setViewUser] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const roleMap = useMemo(() => {
    const map = new Map();
    for (const role of roles) {
      map.set(String(role?.id ?? ""), role);
    }
    return map;
  }, [roles]);

  const adminRoles = useMemo(
    () => roles.filter((role) => normalizeText(role?.position || "") === "admin"),
    [roles]
  );

  const adminRole = adminRoles.find((role) => normalizeText(role?.position || "") === "admin") || adminRoles[0] || null;

  const fetchRoles = async () => {
    try {
      const response = await axios.get(backendUrl + "/api/role/getAll");
      setRoles(Array.isArray(response?.data?.result) ? response.data.result : []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to load roles");
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(backendUrl + "/api/user/getAllUser");
      setUsers(Array.isArray(response?.data?.result) ? response.data.result : []);
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to load admins");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, [refreshKey]);

  useEffect(() => {
    if (!adminRole?.id) return;
    setCreateForm((current) => (current.role_id ? current : { ...current, role_id: String(adminRole.id) }));
  }, [adminRole?.id]);

  const filteredUsers = useMemo(() => {
    const needle = normalizeText(query);

    return users
      .filter((user) => {
        const position = normalizeText(roleMap.get(String(user?.role_id))?.position || "");
        if (position !== "admin") return false;

        const isActive = Boolean(user?.isActive);
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "inactive" && isActive) return false;

        if (!needle) return true;
        const text = [user?.name, user?.email, user?.phone, user?.address, position].filter(Boolean).join(" ").toLowerCase();
        return text.includes(needle);
      })
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [users, query, statusFilter, roleMap]);

  const totalPages = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 10);
    return Math.max(1, Math.ceil(filteredUsers.length / size));
  }, [filteredUsers.length, pageSize]);

  useEffect(() => {
    setCurrentPage((value) => Math.min(Math.max(1, value), totalPages));
  }, [totalPages]);

  const pagedUsers = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 10);
    const start = (currentPage - 1) * size;
    return filteredUsers.slice(start, start + size);
  }, [filteredUsers, currentPage, pageSize]);

  const submitCreate = async (event) => {
    event.preventDefault();

    if (!adminRole?.id) {
      toast.error("No admin role found in the database");
      return;
    }

    if (!createForm.role_id) {
      toast.error("Please choose a role");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(backendUrl + "/api/user/registerAdmin", {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        address: createForm.address.trim(),
        password: createForm.password,
        role_id: Number(createForm.role_id),
      });

      toast.success("Admin created successfully");
      setCreateForm(emptyForm);
      setIsCreateOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.response?.data?.error || error.message || "Failed to create admin");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await axios.put(backendUrl + `/api/user/activateUserById/${user.id}`, { status: !user?.isActive });
      toast.success("Admin updated");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Update failed");
    }
  };

  const deleteAdmin = async (user) => {
    const ok = globalThis.confirm(`Delete admin ${user?.name || user?.email}?`);
    if (!ok) return;

    try {
      await axios.delete(backendUrl + `/api/user/deleteUserById/${user.id}`);
      toast.success("Admin deleted");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Delete failed");
    }
  };

  const openView = (user) => {
    setViewUser(user);
    setIsViewOpen(true);
  };

  const closeView = () => {
    setIsViewOpen(false);
    setViewUser(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Admin Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage admins (view, verify, delete).</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            onClick={() => setIsCreateOpen(true)}
          >
            <FaPlus />
            Add admin
          </button>

          <button
            type="button"
            className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
            disabled={loading}
            onClick={() => setRefreshKey((value) => value + 1)}
            aria-label="Refresh admin list"
            title="Refresh"
          >
            <FaSyncAlt className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 bg-white border border-gray-200 rounded-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-gray-500">Search</div>
            <div className="relative mt-2">
             
              <input
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                placeholder="Name / Email / Phone"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Status</div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              disabled={loading}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 bg-white border border-gray-200 rounded-lg overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Loading admins..." />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 border-b">ID</th>
                <th className="text-left px-4 py-3 border-b">Name</th>
                <th className="text-left px-4 py-3 border-b">Email</th>
                <th className="text-left px-4 py-3 border-b">Phone</th>
                <th className="text-left px-4 py-3 border-b">Address</th>
                <th className="text-left px-4 py-3 border-b">Active</th>
                <th className="text-right px-4 py-3 border-b">Actions</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {pagedUsers.map((user) => (
                <tr key={user?.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-b">{user?.id ?? "-"}</td>
                  <td className="px-4 py-3 border-b">
                    <div className="font-semibold text-gray-900">{user?.name || "Unnamed admin"}</div>
                  </td>
                  <td className="px-4 py-3 border-b max-w-[220px] truncate" title={user?.email || ""}>
                    {user?.email || "-"}
                  </td>
                  <td className="px-4 py-3 border-b max-w-[160px] truncate" title={user?.phone || ""}>
                    {user?.phone || "-"}
                  </td>
                  <td className="px-4 py-3 border-b max-w-[240px] truncate" title={user?.address || ""}>
                    {user?.address || "-"}
                  </td>
                  <td className="px-4 py-3 border-b">
                    <button
                      type="button"
                      onClick={() => toggleActive(user)}
                      className={`rounded-md border px-2 py-1 text-xs ${user?.isActive ? "bg-black text-white" : "bg-white"}`}
                    >
                      {user?.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openView(user)}
                        className="p-2 rounded-md border border-gray-300 bg-white"
                        aria-label="View"
                        title="View"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAdmin(user)}
                        className="p-2 rounded-md border border-gray-300 bg-white text-red-600"
                        aria-label="Delete"
                        title="Delete"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pagedUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-4" colSpan={7}>
                    No admin users match your filters
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}

        {loading ? null : (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-gray-700">
              <div className="text-sm">Showing {filteredUsers.length} result(s)</div>
            <button
              type="button"
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
              onClick={() => {
                setQuery("");
                  setStatusFilter("all");
                setCurrentPage(1);
              }}
            >
              Reset
            </button>
          </div>
        )}

        {loading ? null : (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-gray-700">
            <div className="text-sm">
              Page {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="admin-page-size" className="text-sm">
                Rows
              </label>
              <select
                id="admin-page-size"
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>

              <button
                type="button"
                className="px-3 py-1 rounded-md border border-gray-300 bg-white disabled:opacity-60"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded-md border border-gray-300 bg-white disabled:opacity-60"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-md bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Create admin</h2>
                <p className="mt-1 text-sm text-gray-500">Add new admin details</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-md border border-gray-300 p-2 text-gray-600"
                aria-label="Close create modal"
              >
                <FaTimes />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={submitCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admin-name" className="text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    id="admin-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((current) => ({ ...current, name: e.target.value }))}
                    className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="Admin name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="admin-email" className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="admin-email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((current) => ({ ...current, email: e.target.value }))}
                    className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="admin@example.com"
                    type="email"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="admin-phone" className="text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    id="admin-phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((current) => ({ ...current, phone: e.target.value }))}
                    className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="07x xxx xxxx"
                  />
                </div>
                <div>
                  <label htmlFor="admin-password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="admin-password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((current) => ({ ...current, password: e.target.value }))}
                    className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="Temporary password"
                    type="password"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-address" className="text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  id="admin-address"
                  value={createForm.address}
                  onChange={(e) => setCreateForm((current) => ({ ...current, address: e.target.value }))}
                  className="mt-2 w-full min-h-28 rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="Office / location"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <label htmlFor="admin-role" className="text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="admin-role"
                    value={createForm.role_id}
                    onChange={(e) => setCreateForm((current) => ({ ...current, role_id: e.target.value }))}
                    className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500 bg-white"
                    required
                  >
                    <option value="">Select role</option>
                    {adminRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.position}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateForm(emptyForm)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-slate-950 px-5 py-3 font-semibold text-white shadow-sm disabled:opacity-60"
                  >
                    {submitting ? "Creating..." : "Create admin"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isViewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-md bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Admin details</h2>
                <p className="mt-1 text-sm text-gray-500">View the selected admin account.</p>
              </div>
              <button
                type="button"
                onClick={closeView}
                className="rounded-md border border-gray-300 p-2 text-gray-600"
                aria-label="Close details modal"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{viewUser?.name || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Role</p>
                <p className="font-medium text-gray-900">{normalizeText(roleMap.get(String(viewUser?.role_id))?.position || "") || "Unknown"}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{viewUser?.email || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{viewUser?.phone || "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Address</p>
                <p className="font-medium text-gray-900">{viewUser?.address || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Verified</p>
                <p className="font-medium text-gray-900">{viewUser?.isVerified ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-gray-500">Active</p>
                <p className="font-medium text-gray-900">{viewUser?.isActive ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Admin;

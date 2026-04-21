import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaSyncAlt, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";

const toBoolFilter = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

function User() {
  const [loading, setLoading] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState("");

  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    q: "",
    verified: "",
    active: "",
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRowId, setEditRowId] = useState(null);
  const [editPayload, setEditPayload] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const customerRole = useMemo(() => {
    for (const r of roles) {
      const pos = String(r?.position ?? "").trim().toLowerCase();
      if (!pos) continue;
      if (pos === "customer" || pos.includes("customer")) return r;
    }
    return null;
  }, [roles]);

  const customerRoleId = customerRole?.id ?? null;

  const fetchRoles = async () => {
    setRefLoading(true);
    setRefError("");
    try {
      const res = await axios.get(backendUrl + "/api/role/getAll");
      setRoles(res?.data?.result ?? res?.data ?? []);
    } catch (error) {
      console.error(error);
      setRefError(
        error.response?.data?.message ||
          error.message ||
          `Failed to load roles from ${backendUrl}`
      );
    } finally {
      setRefLoading(false);
    }
  };

  const fetchCustomers = async (roleId) => {
    setLoading(true);
    try {
      const res = await axios.post(backendUrl + "/api/user/getUserByRole", {
        role_id: roleId,
      });
      const data = res?.data?.result ?? [];
      setRows(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to fetch customers");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (refLoading) return;
    if (refError) return;
    if (!roles || roles.length === 0) return;

    if (!customerRoleId) {
      setRows([]);
      return;
    }

    fetchCustomers(customerRoleId);
  }, [customerRoleId, refError, refLoading, roles, refreshKey]);

  const sortedRows = useMemo(() => {
    return rows.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = String(filters.q || "").trim().toLowerCase();
    const verifiedNeedle = toBoolFilter(filters.verified);
    const activeNeedle = toBoolFilter(filters.active);

    return sortedRows.filter((u) => {
      if (q) {
        const hay = `${u?.name ?? ""} ${u?.email ?? ""} ${u?.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (verifiedNeedle !== null) {
        if (Boolean(u?.isVerified) !== verifiedNeedle) return false;
      }
      if (activeNeedle !== null) {
        if (Boolean(u?.isActive) !== activeNeedle) return false;
      }
      return true;
    });
  }, [filters, sortedRows]);

  const totalPages = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 10);
    return Math.max(1, Math.ceil(filteredRows.length / size));
  }, [filteredRows.length, pageSize]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedRows = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 10);
    const start = (currentPage - 1) * size;
    return filteredRows.slice(start, start + size);
  }, [currentPage, filteredRows, pageSize]);

  const openUpdatePopup = (row) => {
    setEditRowId(row.id);
    setEditPayload({
      name: row?.name ?? "",
      email: row?.email ?? "",
      phone: row?.phone ?? "",
      address: row?.address ?? "",
    });
    setIsEditOpen(true);
  };

  const closeUpdatePopup = () => {
    if (isUpdating) return;
    setIsEditOpen(false);
    setEditRowId(null);
  };

  const submitUpdate = async () => {
    if (!editRowId) return;
    if (String(editPayload.email || "").trim() === "") {
      toast.error("Email is required");
      return;
    }

    setIsUpdating(true);
    try {
      await axios.put(backendUrl + `/api/user/updateUserById/${editRowId}`, {
        name: editPayload.name,
        email: editPayload.email,
        phone: editPayload.phone,
        address: editPayload.address,
      });
      toast.success("Customer updated");
      setIsEditOpen(false);
      setEditRowId(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleVerify = async (row) => {
    try {
      await axios.put(backendUrl + `/api/user/verifyUserById/${row.id}`, {
        status: !Boolean(row?.isVerified),
      });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Verify update failed");
    }
  };

  const toggleActive = async (row) => {
    try {
      await axios.put(backendUrl + `/api/user/activateUserById/${row.id}`, {
        status: !Boolean(row?.isActive),
      });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Activation update failed");
    }
  };

  const onDelete = async (row) => {
    const ok = globalThis.confirm(`Delete customer #${row.id}?`);
    if (!ok) return;
    try {
      await axios.delete(backendUrl + `/api/user/deleteUserById/${row.id}`);
      toast.success("Deleted");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Delete failed");
    }
  };

  const title = "Farmers Management";

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage farmers (view, verify/activate, edit, delete).
          </p>
        </div>

        <button
          type="button"
          className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
          disabled={loading || refLoading}
          onClick={() => {
            fetchRoles();
            setRefreshKey((k) => k + 1);
          }}
          aria-label="Refresh customers"
          title="Refresh"
        >
          <FaSyncAlt className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-5 bg-white border border-gray-200 rounded-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500">Search</div>
            <input
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Name / Email / Phone"
              value={filters.q}
              onChange={(e) => {
                setFilters((f) => ({ ...f, q: e.target.value }));
                setCurrentPage(1);
              }}
              disabled={loading}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500">Verified</div>
            <select
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              value={filters.verified}
              onChange={(e) => {
                setFilters((f) => ({ ...f, verified: e.target.value }));
                setCurrentPage(1);
              }}
              disabled={loading}
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Not verified</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-gray-500">Active</div>
            <select
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              value={filters.active}
              onChange={(e) => {
                setFilters((f) => ({ ...f, active: e.target.value }));
                setCurrentPage(1);
              }}
              disabled={loading}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {refLoading ? (
        <LoadingSpinner label="Loading roles..." />
      ) : refError ? (
        <div className="mt-6 bg-white border border-red-200 rounded-md p-4 text-sm text-red-700">{refError}</div>
      ) : !customerRoleId ? (
        <div className="mt-6 bg-white border border-gray-200 rounded-md p-4 text-sm text-gray-700">
          Customer role not found in roles. Add a role with position "Customer" (or containing "customer"), then refresh.
        </div>
      ) : loading ? (
        <LoadingSpinner label="Loading customers..." />
      ) : (
        <>
          <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <div className="px-4 py-3 border-b bg-white">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Showing {filteredRows.length} result(s)</p>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
                  onClick={() => {
                    setFilters({ q: "", verified: "", active: "" });
                    setCurrentPage(1);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 border-b">ID</th>
                  <th className="text-left px-4 py-3 border-b">Name</th>
                  <th className="text-left px-4 py-3 border-b">Email</th>
                  <th className="text-left px-4 py-3 border-b">Phone</th>
                  <th className="text-left px-4 py-3 border-b">Address</th>
                  <th className="text-left px-4 py-3 border-b">Verified</th>
                  <th className="text-left px-4 py-3 border-b">Active</th>
                  <th className="text-right px-4 py-3 border-b">Actions</th>
                </tr>
              </thead>

              <tbody className="text-gray-700">
                {pagedRows.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b">{u.id}</td>
                      <td className="px-4 py-3 border-b">{u.name ?? "-"}</td>
                      <td className="px-4 py-3 border-b">{u.email ?? "-"}</td>
                      <td className="px-4 py-3 border-b">{u.phone ?? "-"}</td>
                      <td className="px-4 py-3 border-b">{u.address ?? "-"}</td>
                      <td className="px-4 py-3 border-b">
                        <button
                          type="button"
                          onClick={() => toggleVerify(u)}
                          className={`px-2 py-1 rounded-md border ${
                            u.isVerified ? "bg-black text-white" : "bg-white"
                          }`}
                        >
                          {u.isVerified ? "Yes" : "No"}
                        </button>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <button
                          type="button"
                          onClick={() => toggleActive(u)}
                          className={`px-2 py-1 rounded-md border ${
                            u.isActive ? "bg-black text-white" : "bg-white"
                          }`}
                        >
                          {u.isActive ? "Yes" : "No"}
                        </button>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => openUpdatePopup(u)}
                            className="p-2 rounded-md border border-gray-300 bg-white"
                            aria-label="Update"
                            title="Update"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(u)}
                            className="p-2 rounded-md border border-gray-300 bg-white text-red-600"
                            aria-label="Delete"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {pagedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4" colSpan={8}>
                      No customers match your filters
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-gray-700">
              <div className="text-sm">
                Page {currentPage} / {totalPages}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm">Rows</label>
                <select
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-md border border-gray-300 bg-white disabled:opacity-60"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg bg-white rounded-md shadow-lg border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">Edit customer</h3>
              <button
                type="button"
                onClick={closeUpdatePopup}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
                disabled={isUpdating}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="px-5 py-4 grid grid-cols-1 gap-3">
              <div>
                <div className="text-xs text-gray-500">Name</div>
                <input
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editPayload.name}
                  onChange={(e) => setEditPayload((p) => ({ ...p, name: e.target.value }))}
                  disabled={isUpdating}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <input
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editPayload.email}
                  onChange={(e) => setEditPayload((p) => ({ ...p, email: e.target.value }))}
                  disabled={isUpdating}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500">Phone</div>
                <input
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editPayload.phone}
                  onChange={(e) => setEditPayload((p) => ({ ...p, phone: e.target.value }))}
                  disabled={isUpdating}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500">Address</div>
                <textarea
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={editPayload.address}
                  onChange={(e) => setEditPayload((p) => ({ ...p, address: e.target.value }))}
                  disabled={isUpdating}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeUpdatePopup}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitUpdate}
                className="px-4 py-2 border border-black rounded-md bg-black text-white hover:bg-gray-900 text-sm"
                disabled={isUpdating}
              >
                {isUpdating ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default User;
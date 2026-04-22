import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FaEye, FaSyncAlt, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

function Contact() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [filters, setFilters] = useState({ q: "" });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const searchInputId = "contact-search";
  const pageSizeSelectId = "contact-page-size";

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(backendUrl + "/api/contact/getAllContact");
      const data = res?.data?.contact ?? res?.data?.result ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          `Failed to fetch contacts from ${backendUrl}`
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactById = async (id) => {
    setDetailsLoading(true);
    try {
      const res = await axios.get(backendUrl + `/api/contact/getContactById/${id}`);
      const contact = res?.data?.contact ?? res?.data?.result ?? null;
      if (!contact) {
        toast.error("Contact not found");
        return;
      }
      setSelectedContact(contact);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to load contact");
    } finally {
      setDetailsLoading(false);
    }
  };

  const onDelete = async (id) => {
    const ok = globalThis.confirm("Delete this contact message?");
    if (!ok) return;

    try {
      await axios.delete(backendUrl + `/api/contact/deleteContactById/${id}`);
      toast.success("Contact deleted");

      if (selectedId === id) {
        setSelectedId(null);
        setSelectedContact(null);
      }

      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to delete contact");
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [refreshKey]);

  const sortedRows = useMemo(() => {
    return rows.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = String(filters.q || "").trim().toLowerCase();
    if (!q) return sortedRows;

    return sortedRows.filter((c) => {
      const hay = `${c?.name ?? ""} ${c?.email ?? ""} ${c?.phoneNumber ?? ""} ${c?.message ?? ""}`
        .toLowerCase()
        .trim();
      return hay.includes(q);
    });
  }, [filters.q, sortedRows]);

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

  const openDetails = async (row) => {
    const id = row?.id;
    if (!id) return;
    setSelectedId(id);
    setSelectedContact(null);
    await fetchContactById(id);
  };

  const closeDetails = () => {
    setSelectedId(null);
    setSelectedContact(null);
  };

  let detailsBody = null;
  if (selectedId) {
    if (detailsLoading) {
      detailsBody = <LoadingSpinner label="Loading contact..." />;
    } else if (selectedContact) {
      detailsBody = (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="text-gray-800 font-medium break-words">{selectedContact?.name ?? ""}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-800 font-medium break-words">{selectedContact?.email ?? ""}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-gray-800 font-medium break-words">
              {selectedContact?.phoneNumber ?? ""}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Received</p>
            <p className="text-gray-800 font-medium break-words">
              {formatDateTime(selectedContact?.createdAt)}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Message</p>
            <p className="text-gray-800 whitespace-pre-wrap break-words mt-1">
              {selectedContact?.message ?? ""}
            </p>
          </div>
        </div>
      );
    } else {
      detailsBody = <div className="p-4 text-sm text-gray-600">No details found.</div>;
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-2xl font-semibold text-gray-800">Contact Management</p>
          <p className="text-sm text-gray-500 mt-1">View and delete contact messages.</p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
          disabled={loading || detailsLoading}
          aria-label="Refresh contacts"
          title="Refresh"
        >
          <FaSyncAlt className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label htmlFor={searchInputId} className="block text-sm text-gray-700 mb-1">
            Search
          </label>
          <input
            id={searchInputId}
            value={filters.q}
            onChange={(e) => {
              setFilters((p) => ({ ...p, q: e.target.value }));
              setCurrentPage(1);
            }}
            placeholder="Search name, email, phone, message..."
            className="w-full rounded border border-gray-300 px-3 py-2 bg-white"
          />
        </div>
      </div>

      {selectedId && (
        <div className="mt-6 rounded border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800">Contact Details</p>
            <button
              type="button"
              onClick={closeDetails}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
            >
              <FaTimes />
              Close
            </button>
          </div>

          {detailsBody}
        </div>
      )}

      <div className="mt-6 rounded border border-gray-200 bg-white overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Loading contacts..." />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left font-semibold px-4 py-3">ID</th>
                <th className="text-left font-semibold px-4 py-3">Name</th>
                <th className="text-left font-semibold px-4 py-3">Email</th>
                <th className="text-left font-semibold px-4 py-3">Phone</th>
                <th className="text-left font-semibold px-4 py-3">Message</th>
                <th className="text-left font-semibold px-4 py-3">Received</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row?.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{row?.id ?? ""}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate" title={row?.name ?? ""}>
                      {row?.name ?? ""}
                    </td>
                    <td className="px-4 py-3 max-w-[220px] truncate" title={row?.email ?? ""}>
                      {row?.email ?? ""}
                    </td>
                    <td className="px-4 py-3">{row?.phoneNumber ?? ""}</td>
                    <td
                      className="px-4 py-3 max-w-[260px] truncate"
                      title={String(row?.message ?? "")}
                    >
                      {row?.message ?? ""}
                    </td>
                    <td className="px-4 py-3">{formatDateTime(row?.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openDetails(row)}
                          className="p-2 rounded-md border border-gray-300 bg-white"
                          aria-label="View"
                          title="View"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(row?.id)}
                          className="p-2 rounded-md border border-gray-300 bg-white text-red-600"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {!loading && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-gray-700">
            <div className="text-sm">
              Page {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor={pageSizeSelectId} className="text-sm">
                Rows
              </label>
              <select
                id={pageSizeSelectId}
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
        )}
      </div>
    </div>
  );
}

export default Contact;
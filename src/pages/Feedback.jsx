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

function Feedback() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [filters, setFilters] = useState({ q: "" });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const searchInputId = "feedback-search";
  const pageSizeSelectId = "feedback-page-size";

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await axios.get(backendUrl + "/api/feedback/getAll");
      const data = res?.data?.result ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          `Failed to fetch feedback from ${backendUrl}`
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackById = async (id) => {
    setDetailsLoading(true);
    try {
      const res = await axios.get(backendUrl + `/api/feedback/getById/${id}`);
      const fb = res?.data?.result ?? null;
      if (!fb) {
        toast.error("Feedback not found");
        return;
      }
      setSelectedFeedback(fb);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to load feedback");
    } finally {
      setDetailsLoading(false);
    }
  };

  const openDetails = async (row) => {
    const id = row?.id;
    if (!id) return;
    setSelectedId(id);
    setSelectedFeedback(null);
    await fetchFeedbackById(id);
  };

  const closeDetails = () => {
    setSelectedId(null);
    setSelectedFeedback(null);
  };

  const toggleVerified = async (row) => {
    if (!row?.id) return;
    try {
      await axios.put(backendUrl + `/api/feedback/verifyById/${row.id}`, {
        status: !row?.verified,
      });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Verify update failed");
    }
  };

  const onDelete = async (row) => {
    const id = row?.id;
    if (!id) return;
    const ok = globalThis.confirm(`Delete feedback #${id}?`);
    if (!ok) return;
    try {
      await axios.delete(backendUrl + `/api/feedback/deleteById/${id}`);
      toast.success("Deleted");
      if (selectedId === id) {
        closeDetails();
      }
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Delete failed");
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [refreshKey]);

  const sortedRows = useMemo(() => {
    return rows.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = String(filters.q || "").trim().toLowerCase();
    if (!q) return sortedRows;

    return sortedRows.filter((f) => {
      const hay = `${f?.name ?? ""} ${f?.message ?? ""} ${f?.rate ?? ""}`.toLowerCase().trim();
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

  let detailsBody = null;
  if (selectedId) {
    if (detailsLoading) {
      detailsBody = <LoadingSpinner label="Loading feedback..." />;
    } else if (selectedFeedback) {
      detailsBody = (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="text-gray-800 font-medium break-words">{selectedFeedback?.name ?? ""}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rate</p>
            <p className="text-gray-800 font-medium break-words">{selectedFeedback?.rate ?? ""}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Verified</p>
            <p className="text-gray-800 font-medium break-words">
              {selectedFeedback?.verified ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Received</p>
            <p className="text-gray-800 font-medium break-words">
              {formatDateTime(selectedFeedback?.createdAt)}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Message</p>
            <p className="text-gray-800 whitespace-pre-wrap break-words mt-1">
              {selectedFeedback?.message ?? ""}
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
          <h1 className="text-xl font-semibold text-gray-800">Feedback Management</h1>
          <p className="text-sm text-gray-500 mt-1">View, verify, and delete feedback.</p>
        </div>

        <button
          type="button"
          className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
          disabled={loading || detailsLoading}
          onClick={() => setRefreshKey((k) => k + 1)}
          aria-label="Refresh feedback"
          title="Refresh"
        >
          <FaSyncAlt className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-5 bg-white border border-gray-200 rounded-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-gray-500">Search</div>
            <input
              id={searchInputId}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Name / Message / Rate"
              value={filters.q}
              onChange={(e) => {
                setFilters((p) => ({ ...p, q: e.target.value }));
                setCurrentPage(1);
              }}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {selectedId ? (
        <div className="mt-6 rounded border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800">Feedback Details</p>
            <button
              type="button"
              onClick={closeDetails}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
              aria-label="Close"
            >
              <FaTimes />
              Close
            </button>
          </div>
          {detailsBody}
        </div>
      ) : null}

      <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Loading feedback..." />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 border-b">ID</th>
                <th className="text-left px-4 py-3 border-b">Name</th>
                <th className="text-left px-4 py-3 border-b">Rate</th>
                <th className="text-left px-4 py-3 border-b">Message</th>
                <th className="text-left px-4 py-3 border-b">Verified</th>
                <th className="text-left px-4 py-3 border-b">Received</th>
                <th className="text-right px-4 py-3 border-b">Actions</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {pagedRows.map((row) => (
                <tr key={row?.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-b">{row?.id ?? "-"}</td>
                  <td className="px-4 py-3 border-b max-w-[200px] truncate" title={row?.name ?? ""}>
                    {row?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 border-b">{row?.rate ?? "-"}</td>
                  <td
                    className="px-4 py-3 border-b max-w-[360px] truncate"
                    title={String(row?.message ?? "")}
                  >
                    {row?.message ?? "-"}
                  </td>
                  <td className="px-4 py-3 border-b">
                    <button
                      type="button"
                      onClick={() => toggleVerified(row)}
                      className={`px-2 py-1 rounded-md border ${
                        row?.verified ? "bg-black text-white" : "bg-white"
                      }`}
                      title="Toggle verified"
                    >
                      {row?.verified ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3 border-b">{formatDateTime(row?.createdAt)}</td>
                  <td className="px-4 py-3 border-b">
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
                        onClick={() => onDelete(row)}
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

              {pagedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4" colSpan={7}>
                    No feedback match your filters
                  </td>
                </tr>
              ) : null}
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

export default Feedback;
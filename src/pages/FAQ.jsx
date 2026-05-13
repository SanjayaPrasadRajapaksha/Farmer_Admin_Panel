import axios from "axios";
import { useEffect, useMemo, useState } from "react";

import { FaEdit, FaPlus, FaSyncAlt, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";
import { highlightMatchedText, matchesSearch } from "../utils/highlightMatch";

const emptyForm = {
  question: "",
  answer: "",
  isActive: true,
};

// FAQ Management Component - handles CRUD operations and filtering for FAQ items
function FAQ() {
  // State: FAQ list, UI visibility, and form data
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  
  // State: Search query and status filter for filtering displayed FAQs
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // State: Pagination controls
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all FAQs from backend API
  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(backendUrl + "/api/faq/getAll");
      setFaqs(Array.isArray(res?.data?.result) ? res.data.result : []);
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to fetch FAQs");
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger FAQ fetch on component mount or when refreshKey changes
  useEffect(() => {
    fetchFaqs();
  }, [refreshKey]);

  // Normalize text for case-insensitive search comparison
  const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

  // Filter FAQs based on search query (with fuzzy or contains matching), and status filter
  const filteredFaqs = useMemo(() => {
    const needle = normalizeText(query);

    return faqs.filter((faq) => {
      // Apply status filter (all, active, inactive)
      const isActive = Boolean(faq?.isActive);
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;

      // Apply search filter across question and answer fields using fuzzy matching
      if (!needle) return true;
      return (
        matchesSearch(faq?.question, needle, "fuzzy") ||
        matchesSearch(faq?.answer, needle, "fuzzy")
      );
    });
  }, [faqs, query, statusFilter]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter]);

  const totalPages = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 10);
    return Math.max(1, Math.ceil(filteredFaqs.length / size));
  }, [filteredFaqs.length, pageSize]);

  useEffect(() => {
    setCurrentPage((value) => Math.min(Math.max(1, value), totalPages));
  }, [totalPages]);

  const pagedFaqs = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 10);
    const start = (currentPage - 1) * size;
    return filteredFaqs.slice(start, start + size);
  }, [filteredFaqs, currentPage, pageSize]);

  // Open create form modal with empty form
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  // Open edit form modal with existing FAQ data
  const openEdit = (faq) => {
    setEditingId(faq.id);
    setForm({ question: faq.question || "", answer: faq.answer || "", isActive: Boolean(faq.isActive) });
    setIsModalOpen(true);
  };

  // Submit form to create or update FAQ
  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        // Update existing FAQ
        await axios.put(backendUrl + `/api/faq/updateById/${editingId}`, {
          question: form.question.trim(),
          answer: form.answer.trim(),
          isActive: Boolean(form.isActive),
        });
        toast.success("FAQ updated successfully");
      } else {
        // Create new FAQ
        await axios.post(backendUrl + "/api/faq/create", {
          question: form.question.trim(),
          answer: form.answer.trim(),
          isActive: Boolean(form.isActive),
        });
        toast.success("FAQ created successfully");
      }
      setIsModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      setRefreshKey((v) => v + 1); // Trigger list refresh
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete FAQ with confirmation
  const deleteFaq = async (faq) => {
    const ok = globalThis.confirm(`Delete FAQ: ${faq?.question?.slice(0, 80) || ""}?`);
    if (!ok) return;
    try {
      await axios.delete(backendUrl + `/api/faq/deleteById/${faq.id}`);
      toast.success("FAQ deleted");
      setRefreshKey((v) => v + 1); // Trigger list refresh
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Delete failed");
    }
  };

  // Toggle FAQ active/inactive status
  const toggleActive = async (faq) => {
    try {
      await axios.put(backendUrl + `/api/faq/updateById/${faq.id}`, {
        isActive: !faq.isActive,
      });
      toast.success("FAQ updated");
      setRefreshKey((v) => v + 1); // Trigger list refresh
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Update failed");
    }
  };

  // Truncate text to specified length and add ellipsis
  const truncated = (text, len = 120) => (String(text || "").length > len ? String(text).slice(0, len) + "…" : text || "-");

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">FAQ Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage frequently asked questions.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            onClick={openCreate}
          >
            <FaPlus />
            Add FAQ
          </button>

          <button
            type="button"
            className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
            disabled={loading}
            onClick={() => setRefreshKey((v) => v + 1)}
            aria-label="Refresh FAQs"
            title="Refresh"
          >
            <FaSyncAlt className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Controls Section */}
      <div className="mt-5 bg-white border border-gray-200 rounded-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input - filters FAQs by question and answer text */}
          <div className="md:col-span-2">
            <div className="text-xs text-gray-500">Search Question & Answer</div>
            <input
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Search by question or answer..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              disabled={loading}
            />
          </div>

          {/* Status Filter - filters FAQs by active/inactive status */}
          <div>
            <div className="text-xs text-gray-500">Status</div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
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

      {/* FAQ List Table Section */}
      <div className="mt-5 bg-white border border-gray-200 rounded-lg overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Loading FAQs..." />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 border-b">ID</th>
                <th className="text-left px-4 py-3 border-b">Question</th>
                <th className="text-left px-4 py-3 border-b">Answer</th>
                <th className="text-left px-4 py-3 border-b">Active</th>
                <th className="text-right px-4 py-3 border-b">Actions</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {pagedFaqs.map((faq) => (
                <tr key={faq.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-b w-20">{faq.id ?? "-"}</td>
                  <td className="px-4 py-3 border-b max-w-[420px] truncate" title={faq.question || ""}>
                    {highlightMatchedText(faq?.question || "-", query, "bg-yellow-200", "fuzzy")}
                  </td>
                  <td className="px-4 py-3 border-b max-w-[420px] truncate" title={faq.answer || ""}>
                    {highlightMatchedText(truncated(faq.answer, 160), query, "bg-yellow-200", "fuzzy")}
                  </td>
                  <td className="px-4 py-3 border-b">
                    {/* Toggle FAQ active/inactive status button */}
                    <button
                      type="button"
                      onClick={() => toggleActive(faq)}
                      className={`rounded-md border px-2 py-1 text-xs ${faq?.isActive ? "bg-black text-white" : "bg-white"}`}
                    >
                      {faq?.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit Button - opens form modal with FAQ data for editing */}
                      <button
                        type="button"
                        onClick={() => openEdit(faq)}
                        className="p-2 rounded-md border border-gray-300 bg-white"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      {/* Delete Button - removes FAQ after confirmation */}
                      <button
                        type="button"
                        onClick={() => deleteFaq(faq)}
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

              {filteredFaqs.length === 0 ? (
                <tr>
                  <td className="px-4 py-4" colSpan={5}>
                    {query || statusFilter !== "all" ? "No FAQs match your filters" : "No FAQs available"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}

        {loading || filteredFaqs.length === 0 ? null : (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-gray-700">
            <div className="text-sm">
              Page {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="faq-page-size" className="text-sm">
                Rows
              </label>
              <select
                id="faq-page-size"
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

      {/* Modal for Creating/Editing FAQs */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-md bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{editingId ? "Edit FAQ" : "Create FAQ"}</h2>
                <p className="mt-1 text-sm text-gray-500">Add or update FAQ content</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md border border-gray-300 p-2 text-gray-600"
                aria-label="Close modal"
              >
                <FaTimes />
              </button>
            </div>

            {/* Form for creating or editing FAQ */}
            <form className="mt-6 space-y-4" onSubmit={submitForm}>
              {/* Question Input Field */}
              <div>
                <label htmlFor="faq-question" className="text-sm font-medium text-gray-700">Question</label>
                <input
                  id="faq-question"
                  value={form.question}
                  onChange={(e) => setForm((c) => ({ ...c, question: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="Enter question"
                  required
                />
              </div>

              {/* Answer Textarea Field */}
              <div>
                <label htmlFor="faq-answer" className="text-sm font-medium text-gray-700">Answer</label>
                <textarea
                  id="faq-answer"
                  value={form.answer}
                  onChange={(e) => setForm((c) => ({ ...c, answer: e.target.value }))}
                  className="mt-2 w-full min-h-32 rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="Provide detailed answer"
                  required
                />
              </div>

              {/* Active Status Checkbox */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isActive)}
                    onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-3">
                {/* Clear Button - resets form fields to empty state */}
                <button
                  type="button"
                  onClick={() => {
                    setForm(emptyForm);
                    setEditingId(null);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700"
                >
                  Clear
                </button>
                {/* Submit Button - creates new or updates existing FAQ based on editing state */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="ml-auto rounded-md bg-slate-950 px-5 py-3 font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {(() => {
                    if (submitting) return "Saving...";
                    if (editingId) return "Update FAQ";
                    return "Create FAQ";
                  })()}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FAQ;

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaPlus, FaSyncAlt, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";
import { highlightMatchedText, matchesSearch } from "../utils/highlightMatch";

const emptyForm = {
  name: "",
};

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

function Category() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get(backendUrl + "/api/category/getAll");
      setCategories(Array.isArray(res?.data?.result) ? res.data.result : []);
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to fetch categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [refreshKey]);

  const filteredCategories = useMemo(() => {
    const needle = normalizeText(query);
    return categories
      .filter((category) => {
        if (!needle) return true;
        return matchesSearch(category?.name, needle, "fuzzy");
      })
      .slice()
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [categories, query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const totalPages = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 10);
    return Math.max(1, Math.ceil(filteredCategories.length / size));
  }, [filteredCategories.length, pageSize]);

  useEffect(() => {
    setCurrentPage((value) => Math.min(Math.max(1, value), totalPages));
  }, [totalPages]);

  const pagedCategories = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 10);
    const start = (currentPage - 1) * size;
    return filteredCategories.slice(start, start + size);
  }, [filteredCategories, currentPage, pageSize]);

  let submitLabel = "Create Category";
  if (editingId) submitLabel = "Update Category";
  if (submitting) submitLabel = "Saving...";

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (category) => {
    setEditingId(category.id);
    setForm({ name: category.name || "" });
    setIsModalOpen(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const name = String(form.name || "").trim();

    if (!name) {
      toast.error("Category name is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await axios.put(backendUrl + `/api/category/updateById/${editingId}`, { name });
        toast.success("Category updated successfully");
      } else {
        await axios.post(backendUrl + "/api/category/create", { name });
        toast.success("Category created successfully");
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCategory = async (category) => {
    const ok = globalThis.confirm(`Delete category: ${category?.name || ""}?`);
    if (!ok) return;

    try {
      await axios.delete(backendUrl + `/api/category/deleteById/${category.id}`);
      toast.success("Category deleted");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Delete failed");
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Category Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage product categories.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            onClick={openCreate}
          >
            <FaPlus />
            Add Category
          </button>

          <button
            type="button"
            className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
            disabled={loading}
            onClick={() => setRefreshKey((value) => value + 1)}
            aria-label="Refresh categories"
            title="Refresh"
          >
            <FaSyncAlt className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 bg-white border border-gray-200 rounded-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-gray-500">Search Category Name</div>
            <input
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Search by category name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 bg-white border border-gray-200 rounded-lg overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Loading categories..." />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 border-b">ID</th>
                <th className="text-left px-4 py-3 border-b">Name</th>
                <th className="text-right px-4 py-3 border-b">Actions</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {pagedCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-b w-24">{category.id ?? "-"}</td>
                  <td className="px-4 py-3 border-b">
                    {highlightMatchedText(category?.name || "-", query, "bg-yellow-200", "fuzzy")}
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="p-2 rounded-md border border-gray-300 bg-white"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(category)}
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

              {filteredCategories.length === 0 ? (
                <tr>
                  <td className="px-4 py-4" colSpan={3}>
                    {query ? "No categories match your search" : "No categories available"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}

        {loading || filteredCategories.length === 0 ? null : (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-gray-700">
            <div className="text-sm">
              Page {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="category-page-size" className="text-sm">
                Rows
              </label>
              <select
                id="category-page-size"
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-md bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {editingId ? "Edit Category" : "Create Category"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">Add or update category name</p>
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

            <form className="mt-6 space-y-4" onSubmit={submitForm}>
              <div>
                <label htmlFor="category-name" className="text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="category-name"
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div className="flex gap-3">
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
                <button
                  type="submit"
                  disabled={submitting}
                  className="ml-auto rounded-md bg-slate-950 px-5 py-3 font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Category;
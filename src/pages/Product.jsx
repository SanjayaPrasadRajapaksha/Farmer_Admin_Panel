import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";

function Product() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState("");

  const [pageSize, setPageSize] = useState(9);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    name: "",
    unit: "",
    categoryId: "",
  });

  const [createPayload, setCreatePayload] = useState({
    name: "",
    unit: "1",
    category_id: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRowId, setEditRowId] = useState(null);
  const [editPayload, setEditPayload] = useState({
    name: "",
    unit: "",
    category_id: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const [uploadingImageId, setUploadingImageId] = useState(null);

  const categoryById = useMemo(() => {
    const map = new Map();
    for (const c of categories) map.set(String(c.id), c);
    return map;
  }, [categories]);

  const toOptionalInt = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number.parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const toRequiredNumber = (value) => {
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const fetchReferenceData = async () => {
    setRefLoading(true);
    setRefError("");
    try {
      const res = await axios.get(backendUrl + "/api/category/getAll");
      setCategories(res?.data?.result ?? res?.data ?? []);
    } catch (error) {
      console.error(error);
      setRefError(
        error.response?.data?.message ||
          error.message ||
          `Failed to load categories from ${backendUrl}`
      );
    } finally {
      setRefLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(backendUrl + "/api/product/getAll");
      const data = res?.data?.result ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [refreshKey]);

  const submitCreate = async (e) => {
    e.preventDefault();
    const name = String(createPayload.name || "").trim();
    const unit = toRequiredNumber(createPayload.unit);
    const category_id = toOptionalInt(createPayload.category_id);

    if (!name) {
      toast.error("Product name is required");
      return;
    }
    if (unit === null) {
      toast.error("Unit must be a number");
      return;
    }

    setIsCreating(true);
    try {
      await axios.post(backendUrl + "/api/product/create", {
        name,
        unit,
        category_id,
      });
      toast.success("Product created");
      setCreatePayload({ name: "", unit: "1", category_id: "" });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Create failed");
    } finally {
      setIsCreating(false);
    }
  };

  const openUpdatePopup = (row) => {
    setEditRowId(row.id);
    setEditPayload({
      name: row.name ?? "",
      unit: row.unit ?? "",
      category_id:
        row.category_id === null || row.category_id === undefined ? "" : String(row.category_id),
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
    const name = String(editPayload.name || "").trim();
    const unit = toRequiredNumber(editPayload.unit);
    const category_id = toOptionalInt(editPayload.category_id);

    if (!name) {
      toast.error("Product name is required");
      return;
    }
    if (unit === null) {
      toast.error("Unit must be a number");
      return;
    }

    setIsUpdating(true);
    try {
      await axios.put(backendUrl + `/api/product/updateById/${editRowId}`, {
        name,
        unit,
        category_id,
      });
      toast.success("Updated");
      setIsEditOpen(false);
      setEditRowId(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const onDelete = async (row) => {
    const ok = globalThis.confirm(`Delete product #${row.id}?`);
    if (!ok) return;
    try {
      await axios.delete(backendUrl + `/api/product/deleteById/${row.id}`);
      toast.success("Deleted");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const uploadImage = async (productId, file) => {
    if (!productId) return;
    if (!file) {
      toast.error("Please choose an image file");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setUploadingImageId(productId);
    try {
      await axios.put(backendUrl + `/api/product/uploadImage/${productId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Image uploaded");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Image upload failed");
    } finally {
      setUploadingImageId(null);
    }
  };

  const filteredRows = useMemo(() => {
    const nameNeedle = String(filters.name || "").trim().toLowerCase();
    const unitNeedle = String(filters.unit || "").trim();
    const categoryNeedle = String(filters.categoryId || "");

    return rows.filter((row) => {
      if (nameNeedle) {
        const rowName = String(row.name ?? "").toLowerCase();
        if (!rowName.includes(nameNeedle)) return false;
      }

      if (unitNeedle) {
        const rowUnit = String(row.unit ?? "");
        if (!rowUnit.includes(unitNeedle)) return false;
      }

      if (categoryNeedle) {
        if (String(row.category_id ?? "") !== categoryNeedle) return false;
      }

      return true;
    });
  }, [rows, filters]);

  const sortedFilteredRows = useMemo(() => {
    return filteredRows.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [filteredRows]);

  const totalPages = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 9);
    return Math.max(1, Math.ceil(sortedFilteredRows.length / size));
  }, [sortedFilteredRows.length, pageSize]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedRows = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 9);
    const start = (currentPage - 1) * size;
    return sortedFilteredRows.slice(start, start + size);
  }, [sortedFilteredRows, currentPage, pageSize]);

  return (
    <div className="w-full">
      {isEditOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeUpdatePopup}
            aria-label="Close popup"
          />
          <div className="relative mx-auto mt-24 w-[min(92vw,720px)] bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Update Product #{editRowId}</h3>
              <button
                type="button"
                className="p-2 rounded hover:bg-gray-100"
                aria-label="Close"
                onClick={closeUpdatePopup}
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Edit</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Product Name</p>
                    <input
                      type="text"
                      className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
                      value={editPayload.name}
                      onChange={(e) => setEditPayload((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Unit</p>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
                      value={editPayload.unit}
                      onChange={(e) => setEditPayload((p) => ({ ...p, unit: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-600 mb-1">Category</p>
                    <select
                      className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
                      value={editPayload.category_id}
                      onChange={(e) => setEditPayload((p) => ({ ...p, category_id: e.target.value }))}
                      disabled={refLoading}
                    >
                      <option value="">{refLoading ? "Loading..." : "No category"}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name ?? `#${c.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-1 md:col-span-2">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={submitUpdate}
                      className="px-4 py-2 rounded-md text-white bg-black disabled:opacity-60"
                    >
                      {isUpdating ? "Updating..." : "Update"}
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={closeUpdatePopup}
                      className="px-4 py-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Product Management</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Add Product</h3>
            <p className="text-sm text-gray-500 mt-1">Create a new product used in market prices.</p>
          </div>
        </div>

        {refError ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {refError}
          </div>
        ) : null}

        <form onSubmit={submitCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
            <input
              type="text"
              className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
              value={createPayload.name}
              onChange={(e) => setCreatePayload((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Tomato"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
              value={createPayload.unit}
              onChange={(e) => setCreatePayload((p) => ({ ...p, unit: e.target.value }))}
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
              value={createPayload.category_id}
              onChange={(e) => setCreatePayload((p) => ({ ...p, category_id: e.target.value }))}
              disabled={refLoading || isCreating}
            >
              <option value="">{refLoading ? "Loading..." : "No category"}</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name ?? `#${c.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex items-end justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="w-full md:w-auto px-5 py-2 rounded-md text-black bg-yellow-400 disabled:opacity-60"
            >
              {isCreating ? "Saving..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Loading products..." />
        ) : (
          <div className="p-4">
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-600 mb-1">Name</p>
                  <input
                    type="text"
                    value={filters.name}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, name: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
                    placeholder="Search by name"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Unit</p>
                  <input
                    type="text"
                    value={filters.unit}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, unit: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
                    placeholder="e.g., 1"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Category</p>
                  <select
                    value={filters.categoryId}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, categoryId: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
                    disabled={refLoading}
                  >
                    <option value="">All</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name ?? `#${c.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">Showing {filteredRows.length} result(s)</p>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
                  onClick={() => {
                    setFilters({ name: "", unit: "", categoryId: "" });
                    setCurrentPage(1);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <div className="text-sm text-gray-600">No products found</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedRows.map((row) => {
                    const category =
                      row.category_id === null || row.category_id === undefined
                        ? null
                        : categoryById.get(String(row.category_id));
                    const isUploadingImage = uploadingImageId === row.id;

                    return (
                      <div key={row.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                        <div className="h-40 bg-gray-50 border-b border-gray-200 flex items-center justify-center overflow-hidden">
                          {row.imageURL ? (
                            <img
                              src={row.imageURL}
                              alt={row.name ?? "Product"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-sm text-gray-500">No image</div>
                          )}
                        </div>

                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm text-gray-500">#{row.id}</div>
                              <div className="font-semibold text-gray-800 truncate">{row.name}</div>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700">
                            <div>
                              <span className="text-gray-500">Unit:</span> {row.unit}
                            </div>
                            <div className="text-right truncate" title={category?.name ?? ""}>
                              <span className="text-gray-500">Category:</span> {category?.name ?? "-"}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openUpdatePopup(row)}
                                className="p-2 rounded-md border border-gray-300 bg-white"
                                aria-label="Update"
                                title="Update"
                              >
                                <FaEdit className="w-4 h-4" />
                              </button>

                              <label
                                className={`px-3 py-2 rounded-md border border-gray-300 bg-white text-sm ${
                                  isUploadingImage ? "opacity-60" : "cursor-pointer"
                                }`}
                                title="Upload Image"
                                aria-label="Upload Image"
                              >
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={isUploadingImage}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    e.target.value = "";
                                    uploadImage(row.id, file);
                                  }}
                                />
                                {isUploadingImage ? "Uploading..." : "Upload"}
                              </label>
                            </div>

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
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {filteredRows.length > 0 ? (
              <div className="mt-4 flex items-center justify-between px-1 py-2 text-gray-700">
                <div className="text-sm">
                  Page {currentPage} / {totalPages}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm">Cards</label>
                  <select
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                    value={String(pageSize)}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="6">6</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                    <option value="18">18</option>
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
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default Product;
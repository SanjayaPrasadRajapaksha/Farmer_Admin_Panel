import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FaCheckSquare, FaEdit, FaRegSquare, FaSyncAlt, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";
import { fuzzyFilterAndSort } from "../utils/fuzzySearch";
import { highlightMatchedText } from "../utils/highlightMatch";

function Market() {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Bulk actions: selectedIds tracks which market-price rows are checked across all pages.
  // This enables page-aware selection so admins can verify or delete multiple rows at once.
  const [selectedIds, setSelectedIds] = useState([]);
  // bulkActionLoading prevents user interaction while a bulk operation (verify/delete) is in progress.
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    date: todayISO,
    productId: "",
    priceTypeId: "",
    economicCenterId: "",
    verified: "", // "" | "true" | "false"
    searchQuery: "", // Fuzzy text search across product name and price
  });

  const [products, setProducts] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [economicCenters, setEconomicCenters] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState("");

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfSource, setPdfSource] = useState("dambulla");
  const [isUploading, setIsUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRowId, setEditRowId] = useState(null);
  const [editPayload, setEditPayload] = useState({
    price: "",
    Date: "",
    economic_center_location_id: "",
    price_type_id: "",
    product_id: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const productById = useMemo(() => {
    const map = new Map();
    for (const p of products) map.set(String(p.id), p);
    return map;
  }, [products]);

  const priceTypeById = useMemo(() => {
    const map = new Map();
    for (const p of priceTypes) map.set(String(p.id), p);
    return map;
  }, [priceTypes]);

  const economicCenterById = useMemo(() => {
    const map = new Map();
    for (const e of economicCenters) map.set(String(e.id), e);
    return map;
  }, [economicCenters]);

  const fetchReferenceData = async () => {
    setRefLoading(true);
    setRefError("");
    try {
      const [productRes, priceTypeRes, economicRes] = await Promise.all([
        axios.get(backendUrl + "/api/product/getAll"),
        axios.get(backendUrl + "/api/price_type/getAll"),
        axios.get(backendUrl + "/api/economic_center/getAll"),
      ]);

      setProducts(productRes?.data?.result ?? productRes?.data ?? []);
      setPriceTypes(priceTypeRes?.data?.result ?? priceTypeRes?.data ?? []);
      setEconomicCenters(economicRes?.data?.result ?? economicRes?.data ?? []);
    } catch (error) {
      console.error(error);
      setRefError(
        error.response?.data?.message ||
          error.message ||
          `Failed to load reference data from ${backendUrl}`
      );
    } finally {
      setRefLoading(false);
    }
  };

  const fetchMarketPrices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(backendUrl + "/api/market_price/getAll");
      const data = response?.data?.result ?? [];
      setRows(Array.isArray(data) ? data : []);
      setCurrentPage(1);
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message ||
        error.message ||
        `Failed to fetch market prices from ${backendUrl}`;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchMarketPrices();
  }, [refreshKey]);

  const onUploadPdf = async (e) => {
    e.preventDefault();
    if (!pdfFile) {
      toast.error("Please choose a PDF file");
      return;
    }

    const uploadPathBySource = {
      dambulla: "/api/market_price/upload_dambulla",
      tambuttegama: "/api/market_price/upload_tambuttegama",
    };

    const uploadPath = uploadPathBySource[pdfSource];
    if (!uploadPath) {
      toast.error("Please select a valid market for the PDF format");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", pdfFile);

    setIsUploading(true);
    try {
      const response = await axios.post(backendUrl + uploadPath, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const inserted = response?.data?.insertedRecords;
      toast.success(
        typeof inserted === "number" ? `Upload successful (${inserted} records)` : "Upload successful"
      );
      setPdfFile(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || error.response?.data?.message || "PDF upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const onDelete = async (row) => {
    const ok = globalThis.confirm(`Delete market price #${row.id}?`);
    if (!ok) return;
    try {
      await axios.delete(backendUrl + `/api/market_price/deleteById/${row.id}`);
      toast.success("Deleted");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const openUpdatePopup = (row) => {
    setEditRowId(row.id);
    setEditPayload({
      price: row.price ?? "",
      Date: row.date ?? "",
      economic_center_location_id:
        row.economic_center_location_id === null || row.economic_center_location_id === undefined
          ? ""
          : String(row.economic_center_location_id),
      price_type_id:
        row.price_type_id === null || row.price_type_id === undefined ? "" : String(row.price_type_id),
      product_id: row.product_id === null || row.product_id === undefined ? "" : String(row.product_id),
    });
    setIsEditOpen(true);
  };

  const closeUpdatePopup = () => {
    if (isUpdating) return;
    setIsEditOpen(false);
    setEditRowId(null);
  };

  const toOptionalInt = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number.parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const submitUpdate = async () => {
    if (!editRowId) return;
    if (String(editPayload.price).trim() === "" || String(editPayload.Date).trim() === "") {
      toast.error("Price and Date are required");
      return;
    }

    setIsUpdating(true);
    try {
      await axios.put(backendUrl + `/api/market_price/updateById/${editRowId}`, {
        price: editPayload.price,
        Date: editPayload.Date,
        economic_center_location_id: toOptionalInt(editPayload.economic_center_location_id),
        price_type_id: toOptionalInt(editPayload.price_type_id),
        product_id: toOptionalInt(editPayload.product_id),
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

  const toggleVerify = async (row) => {
    try {
      await axios.put(backendUrl + `/api/market_price/verifyById/${row.id}`, { verify: !row.verify });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Verify update failed");
    }
  };

  // toggleRowSelection: Add or remove a single row ID from the selection.
  // Normalized to string for consistent comparison across the app.
  const toggleRowSelection = (rowId) => {
    const normalizedId = String(rowId);
    setSelectedIds((current) =>
      current.includes(normalizedId)
        ? current.filter((id) => id !== normalizedId)
        : [...current, normalizedId]
    );
  };

  // runBulkAction: Shared handler for all bulk operations (verify/delete).
  // Validates that at least one row is selected, executes the action callback,
  // clears selection, and refreshes the table. Handles loading state and errors.
  const runBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one market price");
      return;
    }

    setBulkActionLoading(true);
    try {
      await action(selectedIds);
      setSelectedIds([]);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Bulk action failed");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // bulkVerifySelected: Bulk-verify multiple rows. Calls the backend /verifyMany endpoint
  // with the selected IDs and verify flag (true = verify, false = unverify).
  const bulkVerifySelected = async (verify) => {
    await runBulkAction((ids) =>
      axios.put(backendUrl + "/api/market_price/verifyMany", { ids, verify })
    );
  };

  // bulkDeleteSelected: Bulk-delete multiple rows with a confirmation dialog.
  // Shows the count of selected rows to delete before calling the backend /deleteMany endpoint.
  const bulkDeleteSelected = async () => {
    const ok = globalThis.confirm(`Delete ${selectedIds.length} selected market price(s)?`);
    if (!ok) return;

    await runBulkAction((ids) =>
      axios.post(backendUrl + "/api/market_price/deleteMany", { ids })
    );
  };

  const formatDate = (value) => {
    if (!value) return "";
    // backend stores date as string; show as-is
    return String(value);
  };

  const sortedRows = useMemo(() => {
    return rows.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const dateNeedle = String(filters.date || "").trim();
    const verifiedFilter = String(filters.verified || "");
    const searchQuery = String(filters.searchQuery || "").trim();

    let results = sortedRows.filter((row) => {
      if (dateNeedle) {
        const rowDate = String(row.date ?? "");
        if (!rowDate.includes(dateNeedle)) return false;
      }

      if (filters.productId) {
        if (String(row.product_id ?? "") !== String(filters.productId)) return false;
      }

      if (filters.priceTypeId) {
        if (String(row.price_type_id ?? "") !== String(filters.priceTypeId)) return false;
      }

      if (filters.economicCenterId) {
        if (String(row.economic_center_location_id ?? "") !== String(filters.economicCenterId)) return false;
      }

      if (verifiedFilter) {
        const rowVerified = Boolean(row.verify);
        if (verifiedFilter === "true" && !rowVerified) return false;
        if (verifiedFilter === "false" && rowVerified) return false;
      }

      return true;
    });

    // Apply fuzzy search on product names and prices if search query is provided
    if (searchQuery) {
      const enrichedRows = results.map((row) => ({
        ...row,
        productName: productById.get(String(row.product_id))?.name ?? String(row.product_id) ?? "",
      }));
      results = fuzzyFilterAndSort(enrichedRows, searchQuery, ["productName", "price"]);
    }

    return results;
  }, [sortedRows, filters, productById]);

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
  }, [filteredRows, currentPage, pageSize]);

  // Selection helpers for bulk actions:
  // selectedSet: Fast Set lookup to check if a row ID is selected (O(1) lookup).
  const selectedSet = useMemo(() => new Set(selectedIds.map((id) => String(id))), [selectedIds]);

  // currentPageIds: IDs of all rows visible on the current page.
  const currentPageIds = useMemo(() => pagedRows.map((row) => String(row.id)), [pagedRows]);

  // isCurrentPageSelected: True if every row on the current page is selected.
  // Used to show the "select all" checkbox as checked or indeterminate.
  const isCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedSet.has(id));

  // toggleCurrentPageSelection: Select or deselect all rows on the current page.
  // If all are selected, deselect them; otherwise, select all and merge with existing selections from other pages.
  const toggleCurrentPageSelection = () => {
    setSelectedIds((current) => {
      const selectedIdSet = new Set(current.map(String));
      const allSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIdSet.has(id));

      if (allSelected) {
        return current.filter((id) => !currentPageIds.includes(String(id)));
      }

      const merged = new Set(current.map(String));
      currentPageIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  // Clean up selections when table is filtered: Remove selected IDs that are no longer in the filtered result set.
  // This prevents stale selections when filters are applied.
  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredRows.some((row) => String(row.id) === String(id))));
  }, [filteredRows]);

  const tableBody = (() => {
    if (loading) {
      return [];
    }

    if (pagedRows.length === 0) {
      return [
        <tr key="empty">
          <td className="px-4 py-4" colSpan={9}>
            No market prices found
          </td>
        </tr>,
      ];
    }

    return pagedRows.map((row) => {
        const hasProductId = row.product_id !== null && row.product_id !== undefined;
        const hasPriceTypeId = row.price_type_id !== null && row.price_type_id !== undefined;
        const hasEconomicCenterId =
          row.economic_center_location_id !== null && row.economic_center_location_id !== undefined;

        const product = hasProductId ? productById.get(String(row.product_id)) : null;
        const priceType = hasPriceTypeId ? priceTypeById.get(String(row.price_type_id)) : null;
        const econ = hasEconomicCenterId ? economicCenterById.get(String(row.economic_center_location_id)) : null;

        return (
          <tr key={row.id} className="hover:bg-gray-50">
            {/* Row checkbox: Clicking toggles this row's selection for bulk actions. */}
            <td className="px-4 py-3 border-b">
              <button
                type="button"
                onClick={() => toggleRowSelection(row.id)}
                className="inline-flex items-center"
                aria-label={selectedSet.has(String(row.id)) ? `Deselect market price ${row.id}` : `Select market price ${row.id}`}
                title={selectedSet.has(String(row.id)) ? "Deselect" : "Select"}
              >
                {selectedSet.has(String(row.id)) ? <FaCheckSquare /> : <FaRegSquare />}
              </button>
            </td>
            <td className="px-4 py-3 border-b">{row.id}</td>
            <td className="px-4 py-3 border-b">{formatDate(row.date)}</td>
            <td className="px-4 py-3 border-b">{row.price}</td>
            <td className="px-4 py-3 border-b">{highlightMatchedText(product?.name ?? product?.title ?? String(row.product_id ?? ""), filters.searchQuery)}</td>
            <td className="px-4 py-3 border-b">{priceType?.name ?? priceType?.type ?? row.price_type_id ?? ""}</td>
            <td className="px-4 py-3 border-b">{econ?.name ?? econ?.location ?? row.economic_center_location_id ?? ""}</td>
            <td className="px-4 py-3 border-b">
              <button
                type="button"
                onClick={() => toggleVerify(row)}
                className={`px-2 py-1 rounded-md border ${row.verify ? "bg-black text-white" : "bg-white"}`}
              >
                {row.verify ? "Yes" : "No"}
              </button>
            </td>
            <td className="px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openUpdatePopup(row)}
                  className="p-2 rounded-md border border-gray-300 bg-white"
                  aria-label="Update"
                  title="Update"
                >
                  <FaEdit className="w-4 h-4" />
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
        );
      });
  })();

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
              <h3 className="text-lg font-semibold text-gray-700">Update Market Price #{editRowId}</h3>
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
                    <p className="text-xs text-gray-600 mb-1">Price</p>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
                      value={editPayload.price}
                      onChange={(e) => setEditPayload((p) => ({ ...p, price: e.target.value }))}
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Date</p>
                    <input
                      type="text"
                      className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
                      value={editPayload.Date}
                      onChange={(e) => setEditPayload((p) => ({ ...p, Date: e.target.value }))}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Economic Center</p>
                    <select
                      className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
                      value={editPayload.economic_center_location_id}
                      onChange={(e) =>
                        setEditPayload((p) => ({ ...p, economic_center_location_id: e.target.value }))
                      }
                      disabled={refLoading}
                    >
                      <option value="">{refLoading ? "Loading..." : "Select economic center"}</option>
                      {economicCenters.map((e) => (
                        <option key={e.id} value={String(e.id)}>
                          {e.name ?? e.location ?? `#${e.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Price Type</p>
                    <select
                      className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
                      value={editPayload.price_type_id}
                      onChange={(e) => setEditPayload((p) => ({ ...p, price_type_id: e.target.value }))}
                      disabled={refLoading}
                    >
                      <option value="">{refLoading ? "Loading..." : "Select price type"}</option>
                      {priceTypes.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name ?? p.type ?? `#${p.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Product Name</p>
                    <select
                      className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
                      value={editPayload.product_id}
                      onChange={(e) => setEditPayload((p) => ({ ...p, product_id: e.target.value }))}
                      disabled={refLoading}
                    >
                      <option value="">{refLoading ? "Loading..." : "Select product"}</option>
                      {products.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name ?? p.title ?? `#${p.id}`}
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
        <h2 className="text-xl font-semibold text-gray-700">Market Price Management</h2>
        <button
          type="button"
          className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
          disabled={loading || refLoading}
          onClick={() => {
            fetchReferenceData();
            setRefreshKey((k) => k + 1);
          }}
          aria-label="Refresh market prices"
          title="Refresh"
        >
          <FaSyncAlt className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Upload Market Prices (PDF)</h3>
            <p className="text-sm text-gray-500 mt-1">Upload a PDF to insert market prices into the system.</p>
          </div>
        </div>

        {refError ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {refError}
          </div>
        ) : null}

        <form onSubmit={onUploadPdf} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Market (PDF)</label>
            <select
              className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
              value={pdfSource}
              onChange={(e) => setPdfSource(e.target.value)}
              disabled={isUploading}
            >
              <option value="dambulla">Dambulla</option>
              <option value="tambuttegama">Tambuttegama</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">PDF File</label>
            <input
              className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              disabled={isUploading}
            />
          </div>

          <div className="flex items-end justify-start md:justify-end">
            <button
              type="submit"
              disabled={isUploading}
              className="w-full md:w-auto px-5 py-2 rounded-md text-black bg-yellow-400 disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload PDF"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Loading market prices..." />
        ) : (
          <>
            <div className="px-4 py-3 border-b bg-white">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Date</p>
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, date: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Product</p>
                  <select
                    value={filters.productId}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, productId: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
                    disabled={refLoading}
                  >
                    <option value="">All</option>
                    {products.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name ?? p.title ?? `#${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Price Type</p>
                  <select
                    value={filters.priceTypeId}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, priceTypeId: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
                    disabled={refLoading}
                  >
                    <option value="">All</option>
                    {priceTypes.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name ?? p.type ?? `#${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Economic Center</p>
                  <select
                    value={filters.economicCenterId}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, economicCenterId: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
                    disabled={refLoading}
                  >
                    <option value="">All</option>
                    {economicCenters.map((e) => (
                      <option key={e.id} value={String(e.id)}>
                        {e.name ?? e.location ?? `#${e.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Verified</p>
                  <select
                    value={filters.verified}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, verified: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">Showing {filteredRows.length} result(s)</p>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
                  onClick={() => {
                    setFilters({ date: todayISO, productId: "", priceTypeId: "", economicCenterId: "", verified: "", searchQuery: "" });
                    setCurrentPage(1);
                  }}
                >
                  Reset
                </button>
              </div>

              {/* Fuzzy text search field for product names and prices */}
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-1">Search (Product Name or Price)</p>
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, searchQuery: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none"
                  placeholder="Type to search..."
                />
              </div>
            </div>

            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  {/* Header checkbox: Clicking toggles selection of all rows on the current page. */}
                  <th className="text-left px-4 py-3 border-b">
                    <button
                      type="button"
                      onClick={toggleCurrentPageSelection}
                      className="inline-flex items-center"
                      aria-label={isCurrentPageSelected ? "Deselect current page" : "Select current page"}
                      title={isCurrentPageSelected ? "Deselect current page" : "Select current page"}
                    >
                      {isCurrentPageSelected ? <FaCheckSquare /> : <FaRegSquare />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 border-b">ID</th>
                  <th className="text-left px-4 py-3 border-b">Date</th>
                  <th className="text-left px-4 py-3 border-b">Price</th>
                  <th className="text-left px-4 py-3 border-b">Product</th>
                  <th className="text-left px-4 py-3 border-b">Price Type</th>
                  <th className="text-left px-4 py-3 border-b">Economic Center</th>
                  <th className="text-left px-4 py-3 border-b">Verified</th>
                  <th className="text-left px-4 py-3 border-b">Actions</th>
                </tr>
              </thead>

              <tbody className="text-gray-700">{tableBody}</tbody>
            </table>

            {/* Bulk actions bar: Shown when rows are selected. Allows verify, unverify, or delete operations on multiple selected rows. */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-gray-50 text-gray-700">
              <div className="text-sm">{selectedIds.length} selected</div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Verify button: Marks selected rows as verified (verify=true). */}
                <button
                  type="button"
                  className="px-3 py-1 rounded-md border border-gray-300 bg-white disabled:opacity-60"
                  disabled={bulkActionLoading || selectedIds.length === 0}
                  onClick={() => bulkVerifySelected(true)}
                >
                  Verify selected
                </button>
                {/* Unverify button: Marks selected rows as unverified (verify=false). */}
                <button
                  type="button"
                  className="px-3 py-1 rounded-md border border-gray-300 bg-white disabled:opacity-60"
                  disabled={bulkActionLoading || selectedIds.length === 0}
                  onClick={() => bulkVerifySelected(false)}
                >
                  Unverify selected
                </button>
                {/* Delete button: Deletes all selected rows after confirmation. Shows count in confirmation dialog. */}
                <button
                  type="button"
                  className="px-3 py-1 rounded-md border border-red-300 bg-white text-red-600 disabled:opacity-60"
                  disabled={bulkActionLoading || selectedIds.length === 0}
                  onClick={bulkDeleteSelected}
                >
                  Delete selected
                </button>
              </div>
            </div>

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
          </>
        )}
      </div>
    </div>
  );
}

export default Market;
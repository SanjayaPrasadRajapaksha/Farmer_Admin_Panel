import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";

function Market() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    date: "",
    productId: "",
    priceTypeId: "",
    economicCenterId: "",
    verified: "", // "" | "true" | "false"
  });

  const [products, setProducts] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [economicCenters, setEconomicCenters] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState("");

  const [pdfFile, setPdfFile] = useState(null);
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

    const formData = new FormData();
    formData.append("pdf", pdfFile);

    setIsUploading(true);
    try {
      const response = await axios.post(backendUrl + "/api/market_price/upload", formData, {
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
    return sortedRows.filter((row) => {
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
  }, [sortedRows, filters]);

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

  const tableBody = (() => {
    if (loading) {
      return [];
    }

    if (pagedRows.length === 0) {
      return [
        <tr key="empty">
          <td className="px-4 py-4" colSpan={8}>
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
            <td className="px-4 py-3 border-b">{row.id}</td>
            <td className="px-4 py-3 border-b">{formatDate(row.date)}</td>
            <td className="px-4 py-3 border-b">{row.price}</td>
            <td className="px-4 py-3 border-b">{product?.name ?? product?.title ?? row.product_id ?? ""}</td>
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
                    <p className="text-xs text-gray-600 mb-1">price</p>
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
                    <p className="text-xs text-gray-600 mb-1">economic_center_location_id</p>
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
                    <p className="text-xs text-gray-600 mb-1">price_type_id</p>
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
                    <p className="text-xs text-gray-600 mb-1">product_id</p>
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
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700">Upload Market Prices (PDF)</h3>
        </div>

        {refError ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {refError}
          </div>
        ) : null}

        <form onSubmit={onUploadPdf} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-2">PDF File</p>
            <input
              className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-gray-500 mt-2">
              Field name must be <span className="font-mono">pdf</span> (matches backend).
            </p>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 rounded-md text-white bg-black disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading market prices..." />
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 text-gray-700">
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
                    setFilters({ date: "", productId: "", priceTypeId: "", economicCenterId: "", verified: "" });
                    setCurrentPage(1);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="max-h-[520px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
                <tr>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Market;
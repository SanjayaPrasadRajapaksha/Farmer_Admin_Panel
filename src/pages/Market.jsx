import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { backendUrl } from "../App";

function Market() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [economicCenters, setEconomicCenters] = useState([]);

  const [pdfFile, setPdfFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
      // Reference data is optional for CRUD to work (IDs can be typed)
      console.error(error);
    }
  };

  const fetchMarketPrices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(backendUrl + "/api/market_price/getAll");
      const data = response?.data?.result ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to fetch market prices");
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

  const tableBody = (() => {
    if (loading) {
      return [
        <tr key="loading">
          <td className="px-4 py-4" colSpan={8}>
            Loading...
          </td>
        </tr>,
      ];
    }

    if (rows.length === 0) {
      return [
        <tr key="empty">
          <td className="px-4 py-4" colSpan={8}>
            No market prices found
          </td>
        </tr>,
      ];
    }

    return rows
      .slice()
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
      .map((row) => {
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
              <div className="flex gap-3">
                <button type="button" onClick={() => onDelete(row)} className="underline text-red-600">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        );
      });
  })();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Market Price Management</h2>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="px-3 py-2 rounded-md border border-gray-300 bg-white"
          type="button"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700">Upload Market Prices (PDF)</h3>
        </div>

        <form onSubmit={onUploadPdf} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-2">PDF File</p>
            <input
              className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none bg-white"
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-gray-500 mt-2">Field name must be <span className="font-mono">pdf</span> (matches backend).</p>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 rounded-md text-white bg-black disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
            <button
              type="button"
              onClick={() => setPdfFile(null)}
              className="px-4 py-2 rounded-md border border-gray-300 bg-white"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
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

          <tbody className="text-gray-700">
            {tableBody}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Market;
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FaSyncAlt } from "react-icons/fa";
import { TiArrowSortedDown, TiArrowSortedUp } from "react-icons/ti";
import { toast } from "react-toastify";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";

/* eslint-disable react/prop-types */

const TIMEFRAMES = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const DIFF_MODES = [
  { key: "DT", label: "D - T" },
  { key: "TD", label: "T - D" },
];

const TREND_ORDERS = [
  { key: "DT", label: "Dambulla vs Tambuttegama" },
  { key: "TD", label: "Tambuttegama vs Dambulla" },
];

const parseIsoDateUtc = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(`${String(dateStr)}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const toIsoDateUtc = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDaysUtc = (date, deltaDays) => {
  const out = new Date(date);
  out.setUTCDate(out.getUTCDate() + deltaDays);
  return out;
};

const weekStartMondayIso = (dateStr) => {
  const d = parseIsoDateUtc(dateStr);
  if (!d) return null;
  // Monday-based week start.
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // Mon->0, Tue->1, Sun->6
  return toIsoDateUtc(addDaysUtc(d, -diff));
};

const monthKey = (dateStr) => {
  const d = parseIsoDateUtc(dateStr);
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  // market prices look like whole numbers; keep 2 decimals for safety
  return n % 1 === 0 ? String(n) : n.toFixed(2);
};

const formatDelta = (value) => {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  const absStr = abs % 1 === 0 ? String(abs) : abs.toFixed(2);
  return n >= 0 ? `+${absStr}` : `-${absStr}`;
};

const buildTrendSeries = ({
  rows,
  dambullaCenterId,
  tambuttegamaCenterId,
  productId,
  priceTypeId,
  timeframe,
  verifiedOnly,
}) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!dambullaCenterId || !tambuttegamaCenterId) return [];
  if (!productId || !priceTypeId) return [];

  const bucketKey = (dateStr) => {
    if (timeframe === "weekly") return weekStartMondayIso(dateStr);
    if (timeframe === "monthly") return monthKey(dateStr);
    return String(dateStr);
  };

  const buckets = new Map();
  const push = (key, center, priceNum, dateStr) => {
    if (!key) return;
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        // for sorting
        sortDate:
          timeframe === "monthly"
            ? `${key}-01`
            : timeframe === "weekly"
              ? key
              : String(dateStr),
        dPrices: [],
        tPrices: [],
      });
    }
    const b = buckets.get(key);
    if (center === "D") b.dPrices.push(priceNum);
    if (center === "T") b.tPrices.push(priceNum);
  };

  for (const r of rows) {
    const dateStr = r?.date;
    if (!dateStr) continue;

    if (String(r?.product_id ?? "") !== String(productId)) continue;
    if (String(r?.price_type_id ?? "") !== String(priceTypeId)) continue;

    if (verifiedOnly) {
      const v = r?.verify;
      if (v === false) continue;
      // if verify is missing/undefined, keep it (backwards compatibility)
    }

    const centerId = r?.economic_center_location_id;
    const center =
      String(centerId) === String(dambullaCenterId)
        ? "D"
        : String(centerId) === String(tambuttegamaCenterId)
          ? "T"
          : null;
    if (!center) continue;

    const priceNum = Number.parseFloat(String(r?.price));
    if (!Number.isFinite(priceNum)) continue;

    const key = bucketKey(dateStr);
    push(key, center, priceNum, dateStr);
  }

  const avg = (arr) => {
    if (!arr || arr.length === 0) return null;
    let sum = 0;
    for (const v of arr) sum += v;
    return sum / arr.length;
  };

  const out = Array.from(buckets.values())
    .map((b) => {
      const dambulla = avg(b.dPrices);
      const tambuttegama = avg(b.tPrices);
      const delta =
        dambulla === null || tambuttegama === null ? null : dambulla - tambuttegama;

      let label = b.key;
      if (timeframe === "weekly") label = `Week of ${b.key}`;
      if (timeframe === "monthly") label = b.key;

      return {
        period: label,
        sortDate: b.sortDate,
        dambulla,
        tambuttegama,
        delta,
      };
    })
    .filter((x) => x.sortDate)
    .sort((a, b) => String(a.sortDate).localeCompare(String(b.sortDate)));

  // add change vs previous bucket
  for (let i = 0; i < out.length; i++) {
    const prev = i > 0 ? out[i - 1] : null;
    const cur = out[i];
    cur.dChange =
      prev && cur.dambulla !== null && prev.dambulla !== null ? cur.dambulla - prev.dambulla : null;
    cur.tChange =
      prev && cur.tambuttegama !== null && prev.tambuttegama !== null
        ? cur.tambuttegama - prev.tambuttegama
        : null;
    cur.deltaChange =
      prev && cur.delta !== null && prev.delta !== null ? cur.delta - prev.delta : null;
  }

  return out;
};

const TrendTooltip = ({ active, payload, label, diffMode = "DT" }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload?.[0]?.payload;
  if (!row) return null;

  const selectedDelta =
    row.delta === null || row.delta === undefined
      ? null
      : diffMode === "DT"
        ? row.delta
        : -row.delta;
  const diffLabel = diffMode === "DT" ? "D - T" : "T - D";

  return (
    <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm text-sm">
      <div className="font-medium text-gray-800">{label}</div>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600">Dambulla</span>
          <span className="font-medium">{formatNumber(row.dambulla)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600">Tambuttegama</span>
          <span className="font-medium">{formatNumber(row.tambuttegama)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-100">
          <span className="text-gray-600">{diffLabel}</span>
          <span className="font-medium">{formatDelta(selectedDelta)}</span>
        </div>
      </div>
    </div>
  );
};

function Chart() {
  const [loading, setLoading] = useState(false);
  const [marketPrices, setMarketPrices] = useState([]);
  const [products, setProducts] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [economicCenters, setEconomicCenters] = useState([]);

  const [timeframe, setTimeframe] = useState("daily");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [productId, setProductId] = useState("");
  const [priceTypeId, setPriceTypeId] = useState("");

  const [diffMode, setDiffMode] = useState("DT"); // DT = D - T, TD = T - D
  const [trendOrder, setTrendOrder] = useState("DT"); // legend/visual order only

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mpRes, prodRes, ptRes, ecoRes] = await Promise.all([
        axios.get(backendUrl + "/api/market_price/getAll"),
        axios.get(backendUrl + "/api/product/getAll"),
        axios.get(backendUrl + "/api/price_type/getAll"),
        axios.get(backendUrl + "/api/economic_center/getAll"),
      ]);

      setMarketPrices(mpRes?.data?.result ?? []);
      setProducts(prodRes?.data?.result ?? prodRes?.data ?? []);
      setPriceTypes(ptRes?.data?.result ?? ptRes?.data ?? []);
      setEconomicCenters(ecoRes?.data?.result ?? ecoRes?.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to load chart data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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

  const economicCenterIdByName = useMemo(() => {
    const map = new Map();
    for (const e of economicCenters) {
      const name = String(e.name ?? e.location ?? "").trim();
      if (!name) continue;
      map.set(name.toLowerCase(), e.id);
    }
    return map;
  }, [economicCenters]);

  const { dambullaCenterId, tambuttegamaCenterId } = useMemo(() => {
    let dambulla = null;
    let tambuttegama = null;
    for (const [name, id] of economicCenterIdByName.entries()) {
      if (dambulla === null && name.includes("dambulla")) dambulla = id;
      if (tambuttegama === null && name.includes("tambuttegama")) tambuttegama = id;
      if (dambulla !== null && tambuttegama !== null) break;
    }
    return { dambullaCenterId: dambulla, tambuttegamaCenterId: tambuttegama };
  }, [economicCenterIdByName]);

  // Pick sensible defaults once reference lists are available.
  useEffect(() => {
    if (!productId && products.length > 0) setProductId(String(products[0].id));
  }, [productId, products]);

  useEffect(() => {
    if (!priceTypeId && priceTypes.length > 0) setPriceTypeId(String(priceTypes[0].id));
  }, [priceTypeId, priceTypes]);

  const series = useMemo(() => {
    return buildTrendSeries({
      rows: marketPrices,
      dambullaCenterId,
      tambuttegamaCenterId,
      productId,
      priceTypeId,
      timeframe,
      verifiedOnly,
    });
  }, [
    marketPrices,
    dambullaCenterId,
    tambuttegamaCenterId,
    productId,
    priceTypeId,
    timeframe,
    verifiedOnly,
  ]);

  const displaySeries = useMemo(() => {
    return series.map((r) => ({
      ...r,
      deltaSelected:
        r.delta === null || r.delta === undefined ? null : diffMode === "DT" ? r.delta : -r.delta,
    }));
  }, [series, diffMode]);

  const latest = displaySeries.length > 0 ? displaySeries[displaySeries.length - 1] : null;
  const latestDeltaSelected = latest?.deltaSelected ?? null;

  const diffLabel = diffMode === "DT" ? "D - T" : "T - D";
  const trendTitle = trendOrder === "DT" ? "Price trend (Dambulla vs Tambuttegama)" : "Price trend (Tambuttegama vs Dambulla)";
  const trendPrimary = trendOrder === "DT" ? "dambulla" : "tambuttegama";
  const trendSecondary = trendOrder === "DT" ? "tambuttegama" : "dambulla";
  const trendPrimaryName = trendOrder === "DT" ? "Dambulla" : "Tambuttegama";
  const trendSecondaryName = trendOrder === "DT" ? "Tambuttegama" : "Dambulla";

  const productLabel = productId
    ? productById.get(String(productId))?.name ?? productById.get(String(productId))?.title ?? `#${productId}`
    : "";
  const priceTypeLabel = priceTypeId
    ? priceTypeById.get(String(priceTypeId))?.name ?? priceTypeById.get(String(priceTypeId))?.type ?? `#${priceTypeId}`
    : "";

  const centerWarning =
    !dambullaCenterId || !tambuttegamaCenterId
      ? "Economic centers 'Dambulla' and/or 'Tambuttegama' not found in /api/economic_center/getAll"
      : "";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Market Price Trends</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daily / weekly / monthly trends comparing Dambulla vs Tambuttegama.
          </p>
        </div>
        <button
          type="button"
          className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
          disabled={loading}
          onClick={fetchAll}
          aria-label="Refresh market price trends"
          title="Refresh"
        >
          <FaSyncAlt className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <div className="text-xs text-gray-500">Product</div>
          <select
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={loading}
          >
            {products.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name ?? p.title ?? `#${p.id}`}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4">
          <div className="text-xs text-gray-500">Price type</div>
          <select
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            value={priceTypeId}
            onChange={(e) => setPriceTypeId(e.target.value)}
            disabled={loading}
          >
            {priceTypes.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name ?? p.type ?? `#${p.id}`}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4">
          <div className="text-xs text-gray-500">Options</div>
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  disabled={loading}
                />
                Verified only
              </label>
              <div className="flex items-center gap-1">
                {TIMEFRAMES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTimeframe(t.key)}
                    className={
                      "px-3 py-2 text-sm border rounded-md " +
                      (timeframe === t.key
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-500">Trend order</div>
                <select
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                  value={trendOrder}
                  onChange={(e) => setTrendOrder(e.target.value)}
                  disabled={loading}
                >
                  {TREND_ORDERS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs text-gray-500">Difference</div>
                <select
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                  value={diffMode}
                  onChange={(e) => setDiffMode(e.target.value)}
                  disabled={loading}
                >
                  {DIFF_MODES.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading market price trends..." />
      ) : centerWarning ? (
        <div className="mt-6 bg-white border border-red-200 rounded-md p-4 text-sm text-red-700">
          {centerWarning}
        </div>
      ) : displaySeries.length === 0 ? (
        <div className="mt-6 bg-white border border-gray-200 rounded-md p-4 text-sm text-gray-600">
          No data found for the selected product / price type.
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-md p-4">
              <div className="text-xs text-gray-500">Selection</div>
              <div className="mt-2 text-sm text-gray-800 font-medium">
                {productLabel} • {priceTypeLabel}
              </div>
              <div className="mt-2 text-xs text-gray-500">Latest {diffLabel}</div>
              <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-gray-800">
                {latestDeltaSelected === null ? "-" : formatDelta(latestDeltaSelected)}
                {latestDeltaSelected !== null ? (
                  latestDeltaSelected >= 0 ? (
                    <TiArrowSortedUp className="text-green-600" />
                  ) : (
                    <TiArrowSortedDown className="text-red-600" />
                  )
                ) : null}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-md p-4">
              <div className="text-xs text-gray-500">Latest Dambulla</div>
              <div className="mt-1 text-lg font-semibold text-gray-800">{formatNumber(latest?.dambulla)}</div>
              <div className="mt-1 flex items-center gap-1 text-sm">
                {latest?.dChange === null ? (
                  <span className="text-gray-500">No prior period</span>
                ) : latest.dChange >= 0 ? (
                  <>
                    <TiArrowSortedUp className="text-green-600" />
                    <span className="text-green-700">{formatDelta(latest.dChange)}</span>
                  </>
                ) : (
                  <>
                    <TiArrowSortedDown className="text-red-600" />
                    <span className="text-red-700">{formatDelta(latest.dChange)}</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-md p-4">
              <div className="text-xs text-gray-500">Latest Tambuttegama</div>
              <div className="mt-1 text-lg font-semibold text-gray-800">
                {formatNumber(latest?.tambuttegama)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm">
                {latest?.tChange === null ? (
                  <span className="text-gray-500">No prior period</span>
                ) : latest.tChange >= 0 ? (
                  <>
                    <TiArrowSortedUp className="text-green-600" />
                    <span className="text-green-700">{formatDelta(latest.tChange)}</span>
                  </>
                ) : (
                  <>
                    <TiArrowSortedDown className="text-red-600" />
                    <span className="text-red-700">{formatDelta(latest.tChange)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-800">{trendTitle}</h2>
              <div className="text-xs text-gray-500">Hover points for details • Drag the brush to zoom</div>
            </div>

            <div className="mt-4" style={{ height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displaySeries} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<TrendTooltip diffMode={diffMode} />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={trendPrimary}
                    name={trendPrimaryName}
                    stroke="#111827"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={trendSecondary}
                    name={trendSecondaryName}
                    stroke="#6b7280"
                    strokeWidth={2}
                    dot={false}
                  />
                  {timeframe === "daily" ? <Brush dataKey="period" height={18} stroke="#111827" /> : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-800">Difference ({diffLabel})</h2>
              <div className="text-xs text-gray-500">
                {diffMode === "DT" ? "Green = D higher • Red = T higher" : "Green = T higher • Red = D higher"}
              </div>
            </div>

            <div className="mt-4" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displaySeries} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<TrendTooltip diffMode={diffMode} />} />
                  <Bar dataKey="deltaSelected" name={diffLabel}>
                    {displaySeries.map((entry, idx) => (
                      <Cell
                        // Tailwind colors via hex approximations avoided; reuse semantic defaults.
                        key={`cell-${idx}`}
                        fill={
                          entry.deltaSelected === null
                            ? "#9ca3af"
                            : entry.deltaSelected >= 0
                              ? "#16a34a"
                              : "#dc2626"
                        }
                      />
                    ))}
                  </Bar>
                  {timeframe === "daily" ? <Brush dataKey="period" height={18} stroke="#111827" /> : null}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Chart;
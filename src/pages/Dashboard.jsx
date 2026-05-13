import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaBoxOpen, FaCommentDots, FaEnvelopeOpenText, FaSyncAlt, FaUserCheck, FaUsers, FaWarehouse } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const todayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    users: [],
    roles: [],
    products: [],
    marketPrices: [],
    feedbacks: [],
    contacts: [],
    fetchedAt: "",
  });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, roleRes, productRes, marketRes, feedbackRes, contactRes] = await Promise.all([
        axios.get(backendUrl + "/api/user/getAllUser"),
        axios.get(backendUrl + "/api/role/getAll"),
        axios.get(backendUrl + "/api/product/getAll"),
        axios.get(backendUrl + "/api/market_price/getAll"),
        axios.get(backendUrl + "/api/feedback/getAll"),
        axios.get(backendUrl + "/api/contact/getAllContact"),
      ]);

      setStats({
        users: toArray(userRes?.data?.result),
        roles: toArray(roleRes?.data?.result),
        products: toArray(productRes?.data?.result ?? productRes?.data),
        marketPrices: toArray(marketRes?.data?.result),
        feedbacks: toArray(feedbackRes?.data?.result),
        contacts: toArray(contactRes?.data?.result ?? contactRes?.data),
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const roleById = useMemo(() => {
    const map = new Map();
    for (const role of stats.roles) {
      map.set(String(role?.id ?? ""), normalizeText(role?.position));
    }
    return map;
  }, [stats.roles]);

  const computed = useMemo(() => {
    const users = stats.users;
    const marketPrices = stats.marketPrices;
    const today = todayIso();

    const adminCount = users.filter((u) => roleById.get(String(u?.role_id ?? "")) === "admin").length;
    const activeCount = users.filter((u) => Boolean(u?.isActive)).length;
    const verifiedCount = users.filter((u) => Boolean(u?.isVerified)).length;
    const todayPriceEntries = marketPrices.filter((p) => String(p?.date ?? "").startsWith(today)).length;

    const recentFeedbacks = [...stats.feedbacks]
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
      .slice(0, 5);

    const recentContacts = [...stats.contacts]
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
      .slice(0, 5);

    return {
      adminCount,
      activeCount,
      inactiveCount: Math.max(0, users.length - activeCount),
      verifiedCount,
      todayPriceEntries,
      recentFeedbacks,
      recentContacts,
    };
  }, [stats, roleById]);

  const cards = [
    { label: "Total Users", value: stats.users.length, icon: <FaUsers className="text-xl" />, tone: "bg-blue-50 text-blue-700" },
    { label: "Admin Accounts", value: computed.adminCount, icon: <FaUserCheck className="text-xl" />, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Products", value: stats.products.length, icon: <FaBoxOpen className="text-xl" />, tone: "bg-amber-50 text-amber-700" },
    { label: "Market Prices Today", value: computed.todayPriceEntries, icon: <FaWarehouse className="text-xl" />, tone: "bg-violet-50 text-violet-700" },
  ];

  if (loading && !stats.fetchedAt) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of users, activity, and market operations.</p>
          <p className="text-xs text-gray-400 mt-2">Last refreshed: {formatDateTime(stats.fetchedAt)}</p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-700 disabled:opacity-60"
          onClick={fetchDashboard}
          disabled={loading}
          aria-label="Refresh dashboard"
          title="Refresh"
        >
          <FaSyncAlt className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
              <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${card.tone}`}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">User Health</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Active Users</span>
              <span className="font-medium text-gray-900">{computed.activeCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Inactive Users</span>
              <span className="font-medium text-gray-900">{computed.inactiveCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Verified Users</span>
              <span className="font-medium text-gray-900">{computed.verifiedCount}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Engagement</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Feedback Messages</span>
              <span className="font-medium text-gray-900">{stats.feedbacks.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Contact Requests</span>
              <span className="font-medium text-gray-900">{stats.contacts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Price Records (All)</span>
              <span className="font-medium text-gray-900">{stats.marketPrices.length}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Quick Signals</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Admins Share</span>
              <span className="font-medium text-gray-900">
                {stats.users.length > 0 ? `${Math.round((computed.adminCount / stats.users.length) * 100)}%` : "0%"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Activation Rate</span>
              <span className="font-medium text-gray-900">
                {stats.users.length > 0 ? `${Math.round((computed.activeCount / stats.users.length) * 100)}%` : "0%"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Verification Rate</span>
              <span className="font-medium text-gray-900">
                {stats.users.length > 0 ? `${Math.round((computed.verifiedCount / stats.users.length) * 100)}%` : "0%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-800">
            <FaCommentDots />
            <h2 className="text-sm font-semibold">Recent Feedback</h2>
          </div>
          <div className="mt-3 space-y-3">
            {computed.recentFeedbacks.length === 0 ? (
              <p className="text-sm text-gray-500">No feedback records yet.</p>
            ) : (
              computed.recentFeedbacks.map((item) => (
                <div key={item?.id} className="rounded-lg border border-gray-100 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{item?.name || "Anonymous"}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(item?.createdAt)}</p>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item?.message || "-"}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-800">
            <FaEnvelopeOpenText />
            <h2 className="text-sm font-semibold">Recent Contact Requests</h2>
          </div>
          <div className="mt-3 space-y-3">
            {computed.recentContacts.length === 0 ? (
              <p className="text-sm text-gray-500">No contact requests yet.</p>
            ) : (
              computed.recentContacts.map((item) => (
                <div key={item?.id} className="rounded-lg border border-gray-100 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{item?.name || "Unknown"}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(item?.createdAt)}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{item?.email || "-"}</p>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item?.message || "-"}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaEye, FaEyeSlash, FaKey, FaSave, FaSyncAlt, FaUserCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      console.warn("Invalid token format - not enough parts", parts.length);
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = globalThis.atob ? globalThis.atob(padded) : null;
    if (!json) {
      console.warn("Failed to decode base64");
      return null;
    }
    const decoded = JSON.parse(json);
    console.log("✓ Decoded JWT payload:", decoded);
    return decoded;
  } catch (error) {
    console.error("✗ Error decoding JWT:", error.message);
    return null;
  }
};

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const loadStoredProfile = () => {
  try {
    const rawProfile = localStorage.getItem("adminProfile");
    const parsed = rawProfile ? JSON.parse(rawProfile) : null;
    return Array.isArray(parsed) ? parsed[0] ?? null : parsed;
  } catch (error) {
    console.warn("Failed to load stored admin profile:", error);
    return null;
  }
};

const profileToForm = (user) => ({
  name: user?.name ?? "",
  email: user?.email ?? "",
  phone: user?.phone ?? "",
  address: user?.address ?? "",
});

const normalizeProfile = (value) => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value && typeof value === "object" ? value : null;
};

const getUserIdErrorMessage = (token, payload) => {
  if (token) {
    if (payload) {
      return "Unable to extract user ID from token. Please login again.";
    }
    return "Unable to parse authentication token. Please login again.";
  }
  return "No authentication token found. Please login again.";
};

function Setting({ token: appToken = "" }) {
  // Initialize from local cache to avoid an empty card before API response arrives.
  const storedProfile = loadStoredProfile();
  const [tokenState, setTokenState] = useState(() => {
    const initialToken = appToken || localStorage.getItem("token") || "";
    console.log("🔐 Initial token:", initialToken ? `✓ Present (${initialToken.length} chars)` : "✗ Missing");
    return initialToken;
  });
  
  const token = tokenState;
  
  const payload = useMemo(() => {
    // Decode token payload once per token change to extract current user identity.
    if (!token) {
      console.log("⚠️ No token to decode");
      return null;
    }
    const p = decodeJwtPayload(token);
    return p;
  }, [token]);
  
  const userId = payload?.UserId ?? payload?.userId ?? payload?.id ?? null;
  console.log("👤 User ID:", userId || "Not found");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [profile, setProfile] = useState(storedProfile);
  const [form, setForm] = useState(() => profileToForm(storedProfile));
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);

  useEffect(() => {
    // Keep local token state synchronized with App-level auth state.
    const freshToken = appToken || localStorage.getItem("token") || "";
    if (freshToken !== token) {
      console.log("🔄 Token synced from App/localStorage");
      setTokenState(freshToken);
    }
  }, [appToken, token]);

  useEffect(() => {
    // Rehydrate profile/form from localStorage when available.
    const savedProfile = loadStoredProfile();
    if (savedProfile) {
      setProfile((current) => current ?? savedProfile);
      setForm((current) => {
        const nextForm = profileToForm(savedProfile);
        return current.name || current.email || current.phone || current.address ? current : nextForm;
      });
    }
  }, [appToken]);

  const fetchProfile = useCallback(async () => {
    // Load latest profile from API and persist it locally for fast future loads.
    if (!userId) {
      const msg = getUserIdErrorMessage(token, payload);
      console.error("Profile fetch failed:", msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(backendUrl + `/api/user/getUserById/${userId}`);
      const user = normalizeProfile(response?.data?.result ?? null);
      setProfile(user);
      if (user) {
        localStorage.setItem("adminProfile", JSON.stringify(user));
      }
      setForm({
        ...profileToForm(user),
      });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to load profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId, token, payload]);

  const changePassword = async (event) => {
    // Validate password inputs on client side before sending update request.
    event.preventDefault();

    if (!userId) {
      const msg = getUserIdErrorMessage(token, payload);
      console.error("Password change failed:", msg);
      toast.error(msg);
      return;
    }

    const { newPassword, confirmPassword } = passwordForm;

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await axios.put(
        backendUrl + `/api/user/changePasswordByUserId/${userId}`,
        { newPassword: newPassword.trim() }
      );

      if (response?.data?.status) {
        toast.success("Password changed successfully");
        setPasswordForm(emptyPasswordForm);
        setShowPasswordForm(false);
      } else {
        toast.error(response?.data?.message || "Failed to change password");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const submitProfile = async (event) => {
    // Update profile details and reload from server to keep UI authoritative.
    event.preventDefault();

    if (!userId) {
      toast.error("Unable to identify the current user");
      return;
    }

    if (!String(form.name || "").trim() || !String(form.email || "").trim()) {
      toast.error("Name and email are required");
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put(backendUrl + `/api/user/updateUserById/${userId}`, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });

      if (response?.data?.status) {
        toast.success("Profile updated successfully");
        await fetchProfile();
      } else {
        toast.error(response?.data?.message || "Failed to update profile");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const roleText = useMemo(() => String(payload?.role || profile?.role?.position || profile?.role || "Unknown"), [payload, profile]);

  return (
    <div className="w-full space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Profile Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your admin profile information.</p>
        </div>
        <button
          type="button"
          className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-60"
          disabled={loading || saving}
          onClick={fetchProfile}
          aria-label="Refresh profile"
          title="Refresh"
        >
          <FaSyncAlt className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <FaUserCircle className="h-16 w-16" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-gray-900">{profile?.name || "Admin User"}</h2>
            <p className="mt-1 text-sm text-gray-500">{profile?.email || "No email available"}</p>
            <p className="mt-1 text-xs text-gray-400">ID: {profile?.id || "—"}</p>
          </div>

          <div className="mt-6 space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-gray-900">{roleText}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span className="text-gray-500">Status</span>
              <span className={`font-medium ${profile?.isActive ? "text-green-600" : "text-red-600"}`}>
                {profile?.isActive ? "✓ Active" : "✗ Inactive"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span className="text-gray-500">Verified</span>
              <span className={`font-medium ${profile?.isVerified ? "text-green-600" : "text-red-600"}`}>
                {profile?.isVerified ? "✓ Verified" : "✗ Not Verified"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900">{profile?.phone || "—"}</span>
            </div>
            {profile?.createdAt && (
              <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-3 text-xs">
                <span className="text-blue-600">Joined</span>
                <span className="font-medium text-blue-900">{new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Admin Profile Management</h2>
              <p className="mt-1 text-sm text-gray-500">Update your name, email, phone, and address using the profile API.</p>
            </div>
          </div>

          {userId && (
            loading ? (
              <div className="py-16">
                <LoadingSpinner label="Loading profile..." />
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={submitProfile}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="setting-name" className="text-sm font-medium text-gray-700">Full Name *</label>
                      <input
                        id="setting-name"
                        value={form.name}
                        onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="setting-email" className="text-sm font-medium text-gray-700">Email Address *</label>
                      <input
                        id="setting-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="setting-phone" className="text-sm font-medium text-gray-700">Phone Number</label>
                      <input
                        id="setting-phone"
                        value={form.phone}
                        onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                        placeholder="07x xxx xxxx"
                      />
                    </div>
                    <div>
                      <label htmlFor="setting-role" className="text-sm font-medium text-gray-700">Role</label>
                      <input
                        id="setting-role"
                        value={roleText}
                        disabled
                        className="mt-2 w-full rounded-2xl border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700 font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="setting-address" className="text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      id="setting-address"
                      value={form.address}
                      onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                      className="mt-2 w-full min-h-24 rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                      placeholder="Enter your address"
                    />
                  </div>

                  {profile?.updatedAt && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
                      Last updated: {new Date(profile.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(!showPasswordForm);
                    setPasswordForm(emptyPasswordForm);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-300 bg-blue-50 px-5 py-3 font-medium text-blue-700 hover:bg-blue-100"
                >
                  <FaKey />
                  {showPasswordForm ? "Hide Password Change" : "Change Password"}
                </button>
              </div>

              {showPasswordForm && (
                <div className="rounded-xl bg-blue-50 p-4 border border-blue-200 space-y-4">
                  <div>
                    <label htmlFor="new-password" className="text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative mt-2">
                      <input
                        id="new-password"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 pr-10 outline-none focus:border-blue-500"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((current) => ({ ...current, new: !current.new }))}
                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">Confirm Password</label>
                    <div className="relative mt-2">
                      <input
                        id="confirm-password"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 pr-10 outline-none focus:border-blue-500"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((current) => ({ ...current, confirm: !current.confirm }))}
                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordForm(emptyPasswordForm);
                      }}
                      className="rounded-2xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700"
                      disabled={changingPassword}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={changePassword}
                      disabled={changingPassword || !passwordForm.newPassword}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                    >
                      <FaKey />
                      {changingPassword ? "Changing..." : "Update Password"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={fetchProfile}
                  className="rounded-2xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700"
                  disabled={saving || loading}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  <FaSave />
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
            )
          )}
          {!userId && (
            <div className="py-12 text-center">
              <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-amber-800 font-medium mb-3">{getUserIdErrorMessage(token, payload)}</p>
                <button
                  onClick={() => {
                    const freshToken = localStorage.getItem("token") || "";
                    setTokenState(freshToken);
                    if (freshToken) {
                      setTimeout(() => globalThis.location.reload(), 500);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-4 py-2 hover:bg-amber-700"
                >
                  <FaSyncAlt />
                  {token ? "Refresh Page" : "Return to Login"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Setting;

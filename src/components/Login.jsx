import axios from "axios";
import { useState } from "react";
import { toast } from "react-toastify";
import { backendUrl } from "../App";


const decodeJwtPayload = (token) => {
    try {
        const parts = String(token || "").split(".");
        if (parts.length < 2) return null;
        const base64Url = parts[1];
        const base64 = base64Url.replaceAll("-", "+").replaceAll("_", "/");
        const padLen = (4 - (base64.length % 4)) % 4;
        const padded = base64 + "=".repeat(padLen);
        const json = globalThis.atob ? globalThis.atob(padded) : null;
        if (!json) return null;
        return JSON.parse(json);
    } catch {
        return null;
    }
};

const normalizeProfile = (value) => {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value && typeof value === "object" ? value : null;
};


const Login = ({setToken}) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmitHandler = async (e) => {
        try {
            e.preventDefault();
            if (isSubmitting) return;
            setIsSubmitting(true);

            const response = await axios.post(backendUrl + "/api/user/login", { email, password });
            const data = response?.data ?? {};
            const ok = data?.status === true || data?.success === true;
            const token = data?.token;

            if (!ok) {
                toast.error(data?.message || data?.error || "Login failed");
                return;
            }

            if (!token) {
                toast.error("Login succeeded but token missing");
                return;
            }

            // Backend JWT payload includes { role: <Role.position> }. Block non-admin logins here.
            const payload = decodeJwtPayload(token);
            const role = String(payload?.role ?? "").toLowerCase();
            if (role && !role.includes("admin")) {
                toast.error("Only admins can login to the admin panel");
                return;
            }

            const profile = normalizeProfile(data?.result ?? data?.user ?? null);
            if (profile && typeof profile === "object") {
                const safeProfile = { ...profile };
                delete safeProfile.password;
                localStorage.setItem("adminProfile", JSON.stringify(safeProfile));
            }

            setToken(token);
        }
        catch (error) {
            console.error(error);
            toast.error(
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Something went wrong!"
            );
        }
        finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center w-full">
            <div className="bg-white shadow-md rounded-lg px-8 py-6 max-w-md">
                <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
                <form onSubmit={onSubmitHandler}>
                    <div className="mb-3 min-w-72">
                        <p className="text-sm font-medium text-gray-700 mb-2">Email Address</p>
                        <input onChange={(e) => setEmail(e.target.value)} value={email} className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none" type="text" placeholder="your@gmail.com" required />
                    </div>
                    <div className="mb-3 min-w-72">
                        <p className="text-sm font-medium text-gray-700 mb-2">Password</p>
                        <input onChange={(e) => setPassword(e.target.value)} value={password} className="rounded-md w-full px-3 py-2 border border-gray-300 outline-none" type="password" placeholder="Enter your password" required />
                    </div>
                    <button
                        className="mt-2 w-full py-2 px-4 rounded-md text-white bg-black disabled:opacity-60"
                        type="submit"
                        value="Login"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Logging in..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Login
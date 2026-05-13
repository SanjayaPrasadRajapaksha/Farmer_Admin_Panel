import { useMemo } from "react";
import {
    FaBox,
    FaChartBar,
    FaCog,
    FaComments,
    FaEnvelope,
    FaQuestionCircle,
    FaStore,
    FaTachometerAlt,
    FaTimes,
    FaUsers
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = globalThis.atob ? globalThis.atob(padded) : null;

    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
};

// eslint-disable-next-line react/prop-types
function Sidebar({ token, isOpen = false, onClose = () => {} }) {
  const role = useMemo(() => {
    const payload = decodeJwtPayload(token);
    return String(payload?.role || "").toLowerCase();
  }, [token]);

  const isSuperAdmin = role === "super admin";
  const linkClass =
    "flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-200 text-base";

  const activeClass =
    "bg-gradient-to-r from-green-600 to-blue-500 text-white shadow-lg";

  const inactiveClass =
    "text-gray-300 hover:bg-gray-800 hover:text-white";

  const iconClass = "w-6 h-6"; // bigger icons

  const sidebarContent = (
    <div className="flex flex-col gap-4 p-6">

      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaTachometerAlt className={iconClass} />
        <span className="font-medium">Dashboard</span>
      </NavLink>

      <NavLink
        to="/market"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaStore className={iconClass} />
        <span className="font-medium">Market Price</span>
      </NavLink>

      <NavLink
        to="/report"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaChartBar className={iconClass} />
        <span className="font-medium">Report & Analytics</span>
      </NavLink>

      <NavLink
        to="/product"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaBox className={iconClass} />
        <span className="font-medium">Product</span>
      </NavLink>

      <NavLink
        to="/category"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaQuestionCircle className={iconClass} />
        <span className="font-medium">Category</span>
      </NavLink>

      <NavLink
        to="/farmer"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaUsers className={iconClass} />
        <span className="font-medium">Farmer</span>
      </NavLink>

      {isSuperAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
          onClick={onClose}
        >
          <FaComments className={iconClass} />
          <span className="font-medium">Admin</span>
        </NavLink>
      )}

      <NavLink
        to="/feedback"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaComments className={iconClass} />
        <span className="font-medium">Feedback</span>
      </NavLink>

      <NavLink
        to="/contact"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaEnvelope className={iconClass} />
        <span className="font-medium">Contact</span>
      </NavLink>

      <NavLink
        to="/faq"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaQuestionCircle className={iconClass} />
        <span className="font-medium">FAQ</span>
      </NavLink>

      <NavLink
        to="/setting"
        className={({ isActive }) =>
          `${linkClass} ${isActive ? activeClass : inactiveClass}`
        }
        onClick={onClose}
      >
        <FaCog className={iconClass} />
        <span className="font-medium">Settings</span>
      </NavLink>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="w-72 h-full overflow-y-auto overflow-x-hidden bg-gray-900 text-gray-300 shadow-lg hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile Drawer - Overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden p-0"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          aria-label="Close navigation menu"
        />
      )}

      {/* Mobile Drawer - Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-gray-900 text-gray-300 shadow-lg z-50 md:hidden transition-transform duration-300 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Menu</h3>
          <button
            onClick={onClose}
            className="text-white text-2xl hover:bg-gray-800 p-1 rounded"
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>
        {sidebarContent}
      </div>
    </>
  );
}

export default Sidebar;
import {
    FaChartBar,
    FaCog,
    FaComments,
    FaQuestionCircle,
    FaStore,
    FaTachometerAlt,
    FaUsers,
    FaBox,
    FaEnvelope 
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

function Sidebar() {
  const linkClass =
    "flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-200 text-base";

  const activeClass =
    "bg-gradient-to-r from-green-600 to-blue-500 text-white shadow-lg";

  const inactiveClass =
    "text-gray-300 hover:bg-gray-800 hover:text-white";

  const iconClass = "w-6 h-6"; // bigger icons

  return (
    <div className="w-72 h-full overflow-y-auto overflow-x-hidden bg-gray-900 text-gray-300 shadow-lg hidden md:block">
      <div className="flex flex-col gap-4 p-6">

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaTachometerAlt className={iconClass} />
          <span className="font-medium">Dashboard</span>
        </NavLink>

        <NavLink
          to="/market"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaStore className={iconClass} />
          <span className="font-medium">Market Price</span>
        </NavLink>

        <NavLink
          to="/report"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaChartBar className={iconClass} />
          <span className="font-medium">Report & Analytics</span>
        </NavLink>

        {/* <NavLink
          to="/chart"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaComments className={iconClass} />
          <span className="font-medium">Chart</span>
        </NavLink> */}

        <NavLink
          to="/product"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaBox className={iconClass} />
          <span className="font-medium">Product</span>
        </NavLink>

        <NavLink
          to="/customer"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaUsers className={iconClass} />
          <span className="font-medium">Customers</span>
        </NavLink>

        <NavLink
          to="/feedback"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaComments className={iconClass} />
          <span className="font-medium">Feedback</span>
        </NavLink>
        
         <NavLink
          to="/contact"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaEnvelope  className={iconClass} />
          <span className="font-medium">Contact</span>
        </NavLink>

        <NavLink
          to="/faq"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaQuestionCircle className={iconClass} />
          <span className="font-medium">FAQ</span>
        </NavLink>

        <NavLink
          to="/setting"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FaCog className={iconClass} />
          <span className="font-medium">Settings</span>
        </NavLink>

      </div>
    </div>
  );
}

export default Sidebar;
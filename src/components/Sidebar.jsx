import {
    FaChartBar,
    FaCog,
    FaComments,
    FaQuestionCircle,
    FaStore,
    FaTachometerAlt,
    FaUsers
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

function Sidebar() {
    return (
        <div className="w-64 shrink-0 h-full overflow-visible border-r-2 hidden md:block bg-white">
            <div className="flex flex-col gap-4 pt-6 pl-[20%] text-[15px]">

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/dashboard">
                    <FaTachometerAlt className="w-5 h-5" />
                    <p className="hidden md:block">Dashboard</p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/market">
                    <FaStore className="w-5 h-5" />
                    <p className="hidden md:block">Market Price</p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/report">
                    <FaChartBar className="w-5 h-5" />
                    <p className="hidden md:block">Report & Analytics</p>
                </NavLink>
                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/chart">
                    <FaComments className="w-5 h-5" />
                    <p className="hidden md:block">Chart </p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/product">
                    <FaComments className="w-5 h-5" />
                    <p className="hidden md:block">Product </p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/customer">
                    <FaUsers className="w-5 h-5" />
                    <p className="hidden md:block">Customers</p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/feedback">
                    <FaComments className="w-5 h-5" />
                    <p className="hidden md:block">Feedback </p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/faq">
                    <FaQuestionCircle className="w-5 h-5" />
                    <p className="hidden md:block">FAQ </p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/setting">
                    <FaCog className="w-5 h-5" />
                    <p className="hidden md:block">Settings</p>
                </NavLink>

            </div>
        </div>
    );
}

export default Sidebar;
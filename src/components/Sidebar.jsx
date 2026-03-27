import { NavLink } from "react-router-dom";
import { 
    FaTachometerAlt, 
    FaStore, 
    FaChartBar, 
    FaComments, 
    FaQuestionCircle, 
    FaCog 
} from "react-icons/fa";

function Sidebar() {
    return (
        <div className="w-[18%] min-h-screen border-r-2">
            <div className="flex flex-col gap-4 pt-6 pl-[20%] text-[15px]">

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/dashboard">
                    <FaTachometerAlt className="w-5 h-5" />
                    <p className="hidden md:block">Dashboard</p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/market">
                    <FaStore className="w-5 h-5" />
                    <p className="hidden md:block">Market Management</p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/report">
                    <FaChartBar className="w-5 h-5" />
                    <p className="hidden md:block">Report & Analytics</p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/feedback">
                    <FaComments className="w-5 h-5" />
                    <p className="hidden md:block">Feedback Management</p>
                </NavLink>

                <NavLink className="flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-md" to="/faq">
                    <FaQuestionCircle className="w-5 h-5" />
                    <p className="hidden md:block">FAQ Management</p>
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
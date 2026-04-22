import { assets } from "../assets/assets";

function Navbar({ setToken }) {
  return (
    <div className="flex items-center py-3 px-[4%] justify-between bg-gray-900 shadow-md">
      
      {/* Logo */}
      <img
        className="w-[max(8%,80px)]"
        src={assets.logo}
        alt="Logo"
      />

      {/* Logout Button */}
      <button
        onClick={() => setToken("")}
        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 sm:px-7 sm:py-2 rounded-full text-xs sm:text-sm transition transform hover:scale-105"
      >
        Logout
      </button>
    </div>
  );
}

export default Navbar;

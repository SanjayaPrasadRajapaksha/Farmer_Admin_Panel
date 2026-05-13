import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { assets } from "../assets/assets";

// eslint-disable-next-line react/prop-types
function Navbar({ setToken, onMenuToggle }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    onMenuToggle?.(!mobileMenuOpen);
  };

  const handleLogout = () => {
    setToken("");
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex items-center py-3 px-4 sm:px-6 md:px-[4%] justify-between bg-gray-900 shadow-md">
      
      {/* Mobile Menu Toggle */}
      <button
        onClick={handleMenuToggle}
        className="md:hidden text-white text-2xl p-2"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Logo */}
      <img
        className="w-[max(8%,60px)] sm:w-[max(8%,80px)]"
        src={assets.logo}
        alt="Logo"
      />

      {/* Spacer for smaller screens */}
      <div className="md:hidden flex-1" />

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm transition transform hover:scale-105"
      >
        Logout
      </button>
    </div>
  );
}

export default Navbar;

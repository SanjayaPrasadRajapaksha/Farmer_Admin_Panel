import { assets } from "../assets/assets"

function Navbar({setToken}) {
  return (
    <div className="flex items-center py-0 px-[4%] justify-between">
    <img className="w-[max(15%,80px)]" src={assets.logo} alt="Logo" />
    <button onClick={() => setToken("")} className="bg-red-600 text-white px-5 py-2 sm:px-7 sm:py-2 rounded-full text-xs sm:text-sm">
      Logout
    </button>
  </div>
  )
}
export default Navbar
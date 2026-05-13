import { useEffect, useState } from "react"
import { Route, Routes } from "react-router-dom"
import { ToastContainer } from 'react-toastify'
import Login from "./components/Login"
import Navbar from "./components/Navbar"
import Sidebar from "./components/Sidebar"
import Admin from "./pages/Admin"
import Category from "./pages/Category"
import Chart from "./pages/Chart"
import Contact from "./pages/Contact"
import Dashboard from "./pages/Dashboard"
import FAQ from "./pages/FAQ"
import Farmer from "./pages/Farmer"
import Feedback from "./pages/Feedback"
import Market from "./pages/Market"
import Product from "./pages/Product"
import Report from "./pages/Report"
import Setting from "./pages/Setting"

export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency = '$'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : '');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('adminProfile');
    }
  }, [token])

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleMenuToggle = (isOpen) => {
    setSidebarOpen(isOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className='bg-gray-50 h-screen flex flex-col overflow-hidden'>
      <ToastContainer />
      {token === "" ? <Login setToken={setToken} /> :
        <>
          <header className="sticky top-0 z-50 bg-gray-50 shrink-0">
            <Navbar setToken={setToken} onMenuToggle={handleMenuToggle} />
            <hr />
          </header>
          <div className="flex w-full flex-1 min-h-0">
            <aside className="shrink-0 self-stretch min-h-0">
              <Sidebar token={token} isOpen={sidebarOpen} onClose={handleCloseSidebar} />
            </aside>
            <main className="flex-1 min-h-0 overflow-y-auto">
              <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 text-gray-600 text-sm sm:text-base">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard token={token} />} />
                  <Route path="/market" element={<Market token={token} />} />
                  <Route path="/report" element={<Report token={token} />} />
                  <Route path="/feedback" element={<Feedback token={token} />} />
                  {/* eslint-disable-next-line react/jsx-pascal-case */}
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/setting" element={<Setting token={token} />} />
                  <Route path="/product" element={<Product />} />
                  <Route path="/chart" element={<Chart />} />
                  <Route path="/farmer" element={<Farmer token={token} />} />
                  <Route path="/contact" element={<Contact token={token} />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/category" element={<Category />} />
                </Routes>

              </div>
            </main>
          </div>
        </>}

    </div>

  )
}
export default App
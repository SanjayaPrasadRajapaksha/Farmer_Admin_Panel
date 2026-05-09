import { useEffect, useState } from "react"
import { Route, Routes } from "react-router-dom"
import { ToastContainer } from 'react-toastify'
import Login from "./components/Login"
import Navbar from "./components/Navbar"
import Sidebar from "./components/sidebar"
import Admin from "./pages/Admin"
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
import Category from "./pages/Category"

export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency = '$'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : '');
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('adminProfile');
    }
  }, [token])
  return (
    <div className='bg-gray-50 h-screen flex flex-col overflow-hidden'>
      <ToastContainer />
      {token === "" ? <Login setToken={setToken} /> :
        <>
          <header className="sticky top-0 z-50 bg-gray-50 shrink-0">
            <Navbar setToken={setToken} />
            <hr />
          </header>
          <div className="flex w-full flex-1 min-h-0">
            <aside className="shrink-0 self-stretch min-h-0">
              <Sidebar token={token} />
            </aside>
            <main className="flex-1 min-h-0 overflow-y-auto">
              <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-8 text-gray-600 text-base">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard token={token} />} />
                  <Route path="/market" element={<Market token={token} />} />
                  <Route path="/report" element={<Report token={token} />} />
                  <Route path="/feedback" element={<Feedback token={token} />} />
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
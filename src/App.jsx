import { useEffect, useState } from "react"
import { Route, Routes } from "react-router-dom"
import { ToastContainer } from 'react-toastify'
import Login from "./components/Login"
import Navbar from "./components/Navbar"
import Sidebar from "./components/sidebar"
import Dashboard from "./pages/Dashboard"
import FAQ from "./pages/FAQ"
import Feedback from "./pages/Feedback"
import Market from "./pages/Market"
import Report from "./pages/Report"
import Setting from "./pages/Setting"
import Product from "./pages/Product"
import Chart from "./pages/Chart"
import User from "./pages/Customer"

export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency = '$'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : '');
  useEffect(() => {
    localStorage.setItem('token', token);
  }, [token])
  return (
    <div className='bg-gray-50 min-h-screen flex flex-col'>
      <ToastContainer />
      {token === "" ? <Login setToken={setToken} /> :
        <>
          <div className="sticky top-0 z-50 bg-gray-50" style={{ height: 56 }}>
            <Navbar setToken={setToken} />
            <hr />
          </div>
          <div className="flex w-full flex-1 min-h-0">
            <div className="sticky top-[56px] self-start h-[calc(100vh-56px)]">
              <Sidebar />
            </div>
            <main className="flex-1 overflow-y-auto min-h-0">
              <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-8 text-gray-600 text-base">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard token={token} />} />
                  <Route path="/market" element={<Market token={token} />} />
                  <Route path="/report" element={<Report token={token} />} />
                  <Route path="/feedback" element={<Feedback token={token} />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/setting" element={<Setting />} />
                  <Route path="/product" element={<Product />} />
                  <Route path="/chart" element={<Chart />} />
                  <Route path="/customer" element={<User token={token} />} />
                </Routes>

              </div>
            </main>
          </div>
        </>}

    </div>

  )
}

export default App
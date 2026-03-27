import { Route, Routes } from "react-router-dom"
import Navbar from "./components/Navbar"
import Sidebar from "./components/sidebar"
import Dashboard from "./pages/Dashboard"
import Market from "./pages/Market"
import Report from "./pages/Report"
import Setting from "./pages/Setting"
import FAQ from "./pages/FAQ"
import Feedback from "./pages/Feedback"
import { useEffect, useState } from "react"
import Login from "./components/Login"
import { ToastContainer } from 'react-toastify';

export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency = '$'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : '');
  useEffect(() => {
    localStorage.setItem('token', token);
  }, [token])
  return (
    <div className='bg-gray-50 min-h-screen'>
      <ToastContainer />
      {token !== "" ? <Login setToken={setToken} /> :
        <>
          <Navbar setToken={setToken}/>
          <hr />
          <div className="flex w-full">
            <Sidebar />
            <div className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base">
              <Routes>
                <Route path="/dashboard" element={<Dashboard token={token}/>} />
                <Route path="/market" element={<Market token={token}/>} />
                <Route path="/report" element={<Report token={token}/>} />
                <Route path="/feedback" element={<Feedback token={token}/>} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/setting" element={<Setting />} />    
              </Routes>

            </div>
          </div>
        </>}

    </div>

  )
}

export default App
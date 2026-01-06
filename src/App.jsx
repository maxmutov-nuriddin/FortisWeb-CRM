import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Profiles from './pages/Profiles';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import Payments from './pages/Payments';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import NotFound from './pages/NotFound';
import TestApi from './TestApi';

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useAuthStore } from './store/auth.store';
import { useUserStore } from './store/user.store';
import PageLoader from './components/loader/PageLoader';
import Company from './pages/Company';
import ProtectedRoute from './components/ProtectedRoute';

const Placeholder = ({ title }) => (
  <div className="p-8">
    <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
    <p className="text-gray-400">Coming soon based on future requirements.</p>
  </div>
);

function App() {
  const { user, error: authError, getMe } = useAuthStore();
  const { updateUserStatus } = useUserStore();

  // ===================== AUTH =====================
  useEffect(() => {
    getMe()
  }, [])

  useEffect(() => {
    if (!user?.data?.user?._id) return

    const userId = user.data.user._id

    // 1️⃣ при входе → ONLINE
    updateUserStatus(userId, true)

    // 2️⃣ при закрытии вкладки / обновлении → OFFLINE
    const handleUnload = () => {
      updateUserStatus(userId, false)
    }

    window.addEventListener('beforeunload', handleUnload)

    // 3️⃣ heartbeat → обновляем lastLogin
    const interval = setInterval(() => {
      updateUserStatus(userId, true)
    }, 60_000) // 1 минута

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      clearInterval(interval)

      // на всякий случай
      updateUserStatus(userId, false)
    }
  }, [user])


  // ===================== ERRORS =====================
  useEffect(() => {
    if (authError) console.error(authError)
  }, [authError])

  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          <Route path="/test" element={<TestApi />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<NotFound />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="company" element={<Company />} />
              <Route path="orders" element={<Orders />} />
              <Route path="profiles" element={<Profiles />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="settings" element={<Settings />} />
              <Route path="payments" element={<Payments />} />
              <Route path="team-chats" element={<Placeholder title="Team Chats" />} />
              <Route path="projects" element={<Placeholder title="Projects" />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;

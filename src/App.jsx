import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Profiles from './pages/Profiles';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import Payments from './pages/Payments';
import Projects from './pages/Projects';
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
import Chat from './pages/Chat';
import ProtectedRoute from './components/ProtectedRoute';
import './i18n';
import { useSettingsStore } from './store/settings.store';
import i18n from 'i18next';

const Placeholder = ({ title }) => (
  <div className="p-8">
    <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
    <p className="text-gray-400">Coming soon based on future requirements.</p>
  </div>
);

function App() {
  const { user, isAuthenticated, isLoading: authLoading, error: authError, getMe } = useAuthStore();
  const { updateUserStatus } = useUserStore();
  const { language, theme } = useSettingsStore();

  // Handle Theme and Language Change
  useEffect(() => {
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Apply language
    i18n.changeLanguage(language);
  }, [language]);

  // ===================== AUTH =====================
  useEffect(() => {
    getMe()
  }, [])

  useEffect(() => {
    // Проверяем наличие пользователя и его роли
    if (!user?.data?.user?._id || !user?.data?.user?.role) return

    const userId = user.data.user._id
    const userRole = user.data.user.role

    // Проверяем, что это не системная роль или бот
    const allowedRoles = ['user', 'admin', 'moderator'] // добавьте нужные роли
    if (!allowedRoles.includes(userRole)) return

    // Функция с обработкой ошибок
    const safeUpdateStatus = async (userId, isOnline) => {
      try {
        // Проверяем наличие токена перед запросом
        const token = localStorage.getItem('token') || sessionStorage.getItem('token')
        if (!token) {
          console.warn('No auth token found')
          return
        }

        await updateUserStatus(userId, isOnline)
      } catch (error) {
        // Игнорируем 401 ошибки при закрытии вкладки
        if (error?.response?.status === 401) {
          console.warn('Auth token expired or invalid')
        } else {
          console.error('Failed to update user status:', error)
        }
      }
    }

    // 1️⃣ при входе → ONLINE
    safeUpdateStatus(userId, true)

    // 2️⃣ при закрытии вкладки / обновлении → OFFLINE
    const handleUnload = () => {
      // Используем sendBeacon для надёжной отправки при закрытии
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (token) {
        navigator.sendBeacon(
          `http://localhost:5000/api/users/${userId}/status`,
          JSON.stringify({ isOnline: false })
        )
      }
    }

    window.addEventListener('beforeunload', handleUnload)

    // 3️⃣ heartbeat → обновляем lastLogin
    const interval = setInterval(() => {
      safeUpdateStatus(userId, true)
    }, 60_000) // 1 минута

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      clearInterval(interval)

      // При размонтировании компонента
      safeUpdateStatus(userId, false)
    }
  }, [user])


  // ===================== ERRORS =====================
  useEffect(() => {
    if (authError) console.error(authError)
  }, [authError])

  if (authLoading && !isAuthenticated) {
    return (
      <PageLoader />
    );
  }

  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          <Route path="/test" element={<TestApi />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route
                path="company"
                element={
                  user?.data?.user?.role === 'super_admin'
                    ? <Company />
                    : <Navigate to="/" replace />
                }
              />
              <Route
                path="orders"
                element={
                  !['employee', 'worker', 'frontend', 'backend', 'marketer', 'designer'].includes(user?.data?.user?.role)
                    ? <Orders />
                    : <Navigate to="/" replace />
                }
              />
              <Route path="profiles" element={<Profiles />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="settings" element={<Settings />} />
              <Route path="payments" element={<Payments />} />
              <Route path="team-chats" element={<Chat />} />
              <Route path="projects" element={<Projects />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;

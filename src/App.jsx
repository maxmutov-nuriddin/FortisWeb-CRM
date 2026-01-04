import React from 'react';
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

const Placeholder = ({ title }) => (
  <div className="p-8">
    <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
    <p className="text-gray-400">Coming soon based on future requirements.</p>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="settings" element={<Settings />} />
          <Route path="payments" element={<Payments />} />
          <Route path="team-chats" element={<Placeholder title="Team Chats" />} />
          <Route path="projects" element={<Placeholder title="Projects" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

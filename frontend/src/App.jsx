import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

// Layouts
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UserDashboard from './pages/user/UserDashboard';
import UserHome from './pages/user/UserHome';
import SupportPage from './pages/user/SupportPage';
import UserProfile from './pages/user/UserProfile';
import UserBookings from './pages/user/UserBookings';
import UserFavorites from './pages/user/UserFavorites';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStations from './pages/admin/AdminStations';
import AdminChargers from './pages/admin/AdminChargers';
import AdminBookings from './pages/admin/AdminBookings';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import AdminIncentives from './pages/admin/AdminIncentives';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
    return (
        <ConfigProvider
            locale={viVN}
            theme={{
                token: {
                    colorPrimary: '#1890ff',
                    borderRadius: 12,
                    fontFamily: "'Outfit', sans-serif",
                },
                components: {
                    Card: {
                        borderRadiusLG: 20,
                    },
                    Button: {
                        borderRadius: 10,
                        controlHeight: 40,
                    },
                }
            }}
        >
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* User Routes */}
                    <Route element={<UserLayout />}>
                        <Route path="/" element={<UserDashboard />} />
                        <Route path="/map" element={<UserHome />} />
                        <Route path="/support" element={<SupportPage />} />
                        <Route path="/profile" element={<UserProfile />} />
                        <Route path="/bookings" element={<UserBookings />} />
                        <Route path="/favorites" element={<UserFavorites />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                        <Route element={<AdminLayout />}>
                            <Route path="/admin/dashboard" element={<AdminDashboard />} />
                            <Route path="/admin/stations" element={<AdminStations />} />
                            <Route path="/admin/chargers" element={<AdminChargers />} />
                            <Route path="/admin/bookings" element={<AdminBookings />} />
                            <Route path="/admin/users" element={<AdminUsers />} />
                            <Route path="/admin/reports" element={<AdminReports />} />
                            <Route path="/admin/incentives" element={<AdminIncentives />} />
                            {/* Redirect old or potential typos */}
                            <Route path="/admin/support" element={<Navigate to="/admin/incentives" replace />} />
                        </Route>
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </ConfigProvider>
    );
};

export default App;

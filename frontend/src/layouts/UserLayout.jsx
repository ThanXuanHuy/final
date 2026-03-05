import React, { useEffect } from 'react';
import { Layout, Menu, Button, Space, Avatar, Dropdown, notification } from 'antd';
import { InfoCircleFilled } from '@ant-design/icons';
import socket from '../api/socket';
import {
    HomeOutlined,
    EnvironmentOutlined,
    InfoCircleOutlined,
    UserOutlined,
    LogoutOutlined,
    HistoryOutlined,
    HeartOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Header, Content, Footer } = Layout;

const UserLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, isAuthenticated } = useAuthStore();

    const menuItems = [
        { key: '/', icon: <HomeOutlined />, label: 'Trang Chủ' },
        { key: '/map', icon: <EnvironmentOutlined />, label: 'Bản Đồ Trạm Sạc' },
        { key: '/support', icon: <InfoCircleFilled />, label: 'Hỗ Trợ Chuyển Đổi' },
    ];

    useEffect(() => {
        if (isAuthenticated) {
            socket.on('bookingStatusChanged', (data) => {
                notification.info({
                    message: 'Cập nhật lịch sạc',
                    description: `Lịch sạc #${data.bookingId} của bạn đã chuyển sang trạng thái: ${data.newStatus}`,
                    placement: 'bottomRight',
                    icon: <InfoCircleFilled style={{ color: '#1890ff' }} />,
                });
            });
        }
        return () => {
            socket.off('bookingStatusChanged');
        };
    }, [isAuthenticated]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userMenu = {
        items: [
            { key: 'profile', label: 'Hồ sơ cá nhân', icon: <UserOutlined />, onClick: () => navigate('/profile') },
            { key: 'bookings', label: 'Lịch sạc của tôi', icon: <HistoryOutlined />, onClick: () => navigate('/bookings') },
            { key: 'wishlist', label: 'Yêu thích', icon: <HeartOutlined />, onClick: () => navigate('/favorites') },
            { type: 'divider' },
            { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, onClick: handleLogout },
        ],
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%', display: 'flex', alignItems: 'center' }}>
                <div
                    style={{ width: 120, height: 31, background: 'rgba(24, 144, 255, 0.2)', marginRight: 48, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--primary-color)', cursor: 'pointer' }}
                    onClick={() => navigate('/')}
                >
                    EV CHARGE
                </div>
                <Menu
                    mode="horizontal"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ flex: 1, minWidth: 0, border: 'none' }}
                />
                <Space size="middle">
                    {isAuthenticated ? (
                        <Dropdown menu={userMenu}>
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar style={{ backgroundColor: 'var(--primary-color)' }}>{(user?.full_name || user?.email || 'U')[0].toUpperCase()}</Avatar>
                                <span style={{ fontWeight: 500 }}>{user?.full_name || user?.email}</span>
                            </Space>
                        </Dropdown>
                    ) : (
                        <>
                            <Button type="text" onClick={() => navigate('/login')}>Đăng nhập</Button>
                            <Button type="primary" onClick={() => navigate('/register')}>Đăng ký</Button>
                        </>
                    )}
                </Space>
            </Header>
            <Content style={{ padding: '24px 50px', maxWidth: 1440, margin: '0 auto', width: '100%' }}>
                <Outlet />
            </Content>
            <Footer style={{ textAlign: 'center' }}>
                EV Charging Management System ©{new Date().getFullYear()} Created by Advanced AI
            </Footer>
        </Layout>
    );
};

export default UserLayout;

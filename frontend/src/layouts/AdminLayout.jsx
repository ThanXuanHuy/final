import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Avatar, Dropdown, theme } from 'antd';
import {
    DashboardOutlined,
    EnvironmentOutlined,
    ThunderboltOutlined,
    CalendarOutlined,
    UserOutlined,
    BarChartOutlined,
    LogoutOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    BellOutlined,
    SafetyCertificateOutlined,
    CarOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

    const menuItems = [
        { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/admin/stations', icon: <EnvironmentOutlined />, label: 'Quản lý trạm' },
        { key: '/admin/chargers', icon: <ThunderboltOutlined />, label: 'Quản lý trụ' },
        { key: '/admin/bookings', icon: <CalendarOutlined />, label: 'Quản lý lịch sạc' },
        { key: '/admin/users', icon: <UserOutlined />, label: 'Quản lý người dùng' },
        { key: '/admin/incentives', icon: <SafetyCertificateOutlined />, label: 'Quản lý ưu đãi' },
        { key: '/admin/ev-models', icon: <CarOutlined />, label: 'Quản lý mẫu xe' },
        { key: '/admin/reports', icon: <BarChartOutlined />, label: 'Báo cáo & thống kê' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userMenu = {
        items: [
            { key: 'profile', label: 'Hồ sơ', icon: <UserOutlined /> },
            { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, onClick: handleLogout },
        ],
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
                <div style={{ height: 64, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                    {!collapsed ? 'EV ADMIN' : 'EV'}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <Layout>
                <Header>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />
                    <Space size="large" style={{ marginRight: 24 }}>
                        <Button type="text" icon={<BellOutlined />} />
                        <Dropdown menu={userMenu}>
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar icon={<UserOutlined />} src={user?.avatar} />
                                <span>{user?.full_name || user?.email || 'Admin'}</span>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>
                <Content
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                        overflow: 'auto',
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;

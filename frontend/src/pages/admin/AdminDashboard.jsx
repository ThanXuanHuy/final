import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Space, DatePicker } from 'antd';
const { RangePicker } = DatePicker;
import {
    ThunderboltOutlined,
    UserOutlined,
    EnvironmentOutlined,
    SafetyCertificateOutlined
} from '@ant-design/icons';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import userService from '../../api/userService';
import incentiveService from '../../api/incentiveService';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import bookingService from '../../api/bookingService';

const { Title, Text } = Typography;
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: 0, stations: 0, bookings: 0, revenue: 0, chartData: [] });
    const [recentBookings, setRecentBookings] = useState([]);
    const [recentIncentives, setRecentIncentives] = useState([]);
    const [dateRange, setDateRange] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            let start = null;
            let end = null;
            if (dateRange && dateRange.length === 2) {
                start = dateRange[0].format('YYYY-MM-DD');
                end = dateRange[1].format('YYYY-MM-DD');
            }

            const [statsResponse, bookingsResponse, incentivesResponse] = await Promise.all([
                userService.getStats(start, end),
                bookingService.getAll(),
                incentiveService.getAllRegistrations()
            ]);
            let filteredBookings = bookingsResponse;
            if (start && end) {
                const startDateStr = start;
                const endDateStr = end;
                filteredBookings = bookingsResponse.filter(b => {
                    const bDate = dayjs(b.booking_date).format('YYYY-MM-DD');
                    return bDate >= startDateStr && bDate <= endDateStr;
                });
            }

            setStats(statsResponse);
            setRecentBookings(filteredBookings.slice(0, 5));
            setRecentIncentives(incentivesResponse.slice(0, 5));
        } catch (error) {
            console.error('Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [dateRange]);

    const columns = [
        {
            title: 'Khách hàng',
            dataIndex: 'user',
            key: 'user',
        },
        {
            title: 'Trạm',
            dataIndex: 'station',
            key: 'station',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const config = {
                    PENDING: { color: 'orange', label: 'Đang chờ' },
                    CONFIRMED: { color: 'cyan', label: 'Đã xác nhận' },
                    CHARGING: { color: 'blue', label: 'Đang sạc' },
                    PENDING_PAYMENT: { color: 'volcano', label: 'Chờ thanh toán' },
                    PENDING_REFUND: { color: 'magenta', label: 'Chờ hoàn tiền' },
                    COMPLETED: { color: 'green', label: 'Hoàn thành' },
                    CANCELLED: { color: 'gray', label: 'Đã hủy' },
                    EXPIRED: { color: 'red', label: 'Quá hạn' },
                };
                const item = config[status?.toUpperCase()] || { color: 'default', label: status };
                return (
                    <Tag color={item.color}>
                        {item.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Ngày',
            dataIndex: 'date',
            key: 'date',
        },
    ];

    // Table data will come from recentBookings state

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Row justify="space-between" align="middle">
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Dashboard tổng quan</Title>
                </Col>
                <Col>
                    <RangePicker
                        onChange={(dates) => setDateRange(dates)}
                        format="DD/MM/YYYY"
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} loading={loading}>
                        <Statistic
                            title="Tổng lượt đặt"
                            value={stats.bookings}
                            prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                        />
                        <Text type="secondary">Tất cả thời gian</Text>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} loading={loading}>
                        <Statistic
                            title="Khách hàng"
                            value={stats.users}
                            prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                        />
                        <Text type="secondary">Đã đăng ký</Text>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} loading={loading}>
                        <Statistic
                            title="Trạm Sạc"
                            value={stats.stations}
                            prefix={<EnvironmentOutlined style={{ color: '#faad14' }} />}
                        />
                        <Text type="secondary">Trên hệ thống</Text>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        hoverable
                        bordered={false}
                        loading={loading}
                        onClick={() => navigate('/admin/incentives')}
                        style={{ cursor: 'pointer' }}
                    >
                        <Statistic
                            title="Hồ sơ hỗ trợ"
                            value={recentIncentives.length}
                            prefix={<SafetyCertificateOutlined style={{ color: '#722ed1' }} />}
                        />
                        <Text type="secondary">Chờ xét duyệt</Text>
                    </Card>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={24}>
                    <Card title="Biểu đồ doanh thu theo tháng" bordered={false}>
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.chartData} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1890ff" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" padding={{ left: 30, right: 30 }} />
                                    <YAxis
                                        tickFormatter={(val) => val.toLocaleString('vi-VN')}
                                        width={110}
                                        label={{ value: 'VNĐ', position: 'top', offset: 10 }}
                                    />
                                    <Tooltip formatter={(value) => `${Number(value).toLocaleString('vi-VN')} VNĐ`} />
                                    <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#1890ff" fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>


            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Lịch đặt gần đây" >
                        <Table
                            columns={columns}
                            dataSource={recentBookings.map(b => ({
                                ...b,
                                user: b.full_name,
                                station: b.station_name,
                                date: dayjs(b.booking_date).format('DD/MM/YYYY')
                            }))}
                            pagination={false}
                            loading={loading}
                            size="small"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Đăng ký hỗ trợ mới nhất" >
                        <Table
                            pagination={false}
                            loading={loading}
                            size="small"
                            dataSource={recentIncentives.map(i => ({
                                ...i,
                                key: i.id
                            }))}
                            columns={[
                                { title: 'Khách hàng', dataIndex: 'full_name', key: 'name' },
                                { title: 'Chương trình', dataIndex: 'incentive_title', key: 'title' },
                                {
                                    title: 'Trạng thái',
                                    dataIndex: 'status',
                                    key: 'status',
                                    render: (s) => <Tag color={s === 'PENDING' ? 'orange' : s === 'APPROVED' ? 'green' : 'red'}>{s === 'PENDING' ? 'Đang chờ' : s === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}</Tag>
                                }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </Space>
    );
};

export default AdminDashboard;

import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Space } from 'antd';
import {
    ThunderboltOutlined,
    UserOutlined,
    EnvironmentOutlined,
    RiseOutlined,
    EditOutlined,
    SafetyCertificateOutlined,
    CalendarOutlined
} from '@ant-design/icons';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
    Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import userService from '../../api/userService';
import incentiveService from '../../api/incentiveService';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import bookingService from '../../api/bookingService';

const { Title, Text } = Typography;

// No static data needed here anymore

// No static data needed here anymore


const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: 0, stations: 0, bookings: 0, revenue: 0, chartData: [] });
    const [recentBookings, setRecentBookings] = useState([]);
    const [recentIncentives, setRecentIncentives] = useState([]);
    const [trafficPrediction, setTrafficPrediction] = useState([]);
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const [statsResponse, bookingsResponse, incentivesResponse, predictionResponse] = await Promise.all([
                    userService.getStats(),
                    bookingService.getAll(),
                    incentiveService.getAllRegistrations(),
                    userService.getPrediction()
                ]);
                setStats(statsResponse);
                setRecentBookings(bookingsResponse.slice(0, 5));
                setRecentIncentives(incentivesResponse.slice(0, 5));
                setTrafficPrediction(predictionResponse);
            } catch (error) {

                console.error('Failed to fetch dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const columns = [
        {
            title: 'Mã Lịch',
            dataIndex: 'id',
            key: 'id',
        },
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
            render: (status) => (
                <Tag color={status === 'completed' ? 'green' : 'blue'}>
                    {status.toUpperCase()}
                </Tag>
            ),
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
            <Title level={2}>Dashboard Tổng Quan</Title>

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

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title="Phân tích doanh thu & Lượt đặt" bordered={false}>
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1890ff" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="revenue" stroke="#1890ff" fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Gia tăng khách hàng" bordered={false}>
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="bookings" fill="#52c41a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card title="Phân tích & Dự báo lưu lượng hệ thống (AI Model)" bordered={false}>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trafficPrediction}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="hour" label={{ value: 'Giờ trong ngày', position: 'insideBottom', offset: -5 }} />
                                    <YAxis label={{ value: '% Tải', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line name="Thực tế" type="monotone" dataKey="usage" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line name="Dự báo AI" type="monotone" dataKey="predict" stroke="#52c41a" strokeDasharray="5 5" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Lịch đặt gần đây" bordered={false}>
                        <Table
                            columns={columns}
                            dataSource={recentBookings.map(b => ({
                                ...b,
                                key: b.id,
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
                    <Card title="Đăng ký hỗ trợ mới nhất" bordered={false}>
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
                                    render: (s) => <Tag color={s === 'PENDING' ? 'orange' : s === 'APPROVED' ? 'green' : 'red'}>{s}</Tag>
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

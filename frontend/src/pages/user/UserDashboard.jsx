import React from 'react';
import { Row, Col, Card, Typography, Button, Space, Statistic, List, Avatar, Tag, Progress, Empty } from 'antd';
import {
    ThunderboltOutlined,
    EnvironmentOutlined,
    ArrowRightOutlined,
    RiseOutlined,
    CalendarOutlined,
    CarOutlined,
    GlobalOutlined,
    StarFilled
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../../store/authStore';
import bookingService from '../../api/bookingService';
import stationService from '../../api/stationService';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const consumptionData = [
    { day: 'Thứ 2', kwh: 12 },
    { day: 'Thứ 3', kwh: 18 },
    { day: 'Thứ 4', kwh: 15 },
    { day: 'Thứ 5', kwh: 25 },
    { day: 'Thứ 6', kwh: 20 },
    { day: 'Thứ 7', kwh: 35 },
    { day: 'CN', kwh: 30 },
];

const UserDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recommended, setRecommended] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (user?.id) {
                try {
                    const [bookingData, stationData] = await Promise.all([
                        bookingService.getByUser(user.id),
                        stationService.getRecommendations(10.762622, 106.660172)
                    ]);
                    setBookings(bookingData);
                    setRecommended(stationData.slice(0, 3));
                } catch (error) {
                    console.error('Failed to fetch dashboard data');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user]);

    const nextBooking = bookings.find(b => b.status === 'PENDING' || b.status === 'CONFIRMED');
    const totalKwh = bookings.reduce((acc, b) => acc + (b.estimated_kwh || 0), 0);
    const co2Saved = (totalKwh * 0.4).toFixed(1);

    // Safe sorting
    const sortedBookings = [...bookings].sort((a, b) => {
        if (!a.booking_date || !b.booking_date) return 0;
        return new Date(a.booking_date) - new Date(b.booking_date);
    });

    const safeDynamicConsumptionData = sortedBookings
        .slice(-7)
        .map(b => ({
            day: dayjs(b.booking_date).format('DD/MM'),
            kwh: b.estimated_kwh || 0
        }));

    const finalDisplayData = safeDynamicConsumptionData.length > 0 ? safeDynamicConsumptionData : consumptionData;

    return (
        <div style={{ paddingBottom: 60 }}>
            {/* Hero Welcome */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 40 }}
            >
                <Row gutter={24} align="middle">
                    <Col xs={24} lg={16}>
                        <Title level={1} style={{ margin: 0, fontWeight: 800 }}>Chào buổi sáng, {user?.full_name || 'Khách'}! 👋</Title>
                        <Paragraph style={{ fontSize: 18, color: '#595959', marginTop: 8 }}>
                            {nextBooking
                                ? `Bạn có một lịch sạc sắp tới tại ${nextBooking.station_name} vào ${nextBooking.start_time} - ${dayjs(nextBooking.booking_date).format('DD/MM')}.`
                                : "Hệ thống đang hoạt động ổn định. Hãy tìm một trạm sạc gần bạn ngay."}
                        </Paragraph>
                    </Col>
                    <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
                        <Button type="primary" size="large" icon={<EnvironmentOutlined />} onClick={() => navigate('/map')} style={{ height: 50, borderRadius: 25, padding: '0 30px' }}>
                            Tìm Trạm Gần Đây
                        </Button>
                    </Col>
                </Row>
            </motion.div>

            <Row gutter={[24, 24]}>
                {/* Active Charging Card */}
                <Col xs={24} lg={16}>
                    <motion.div whileHover={{ y: -5 }}>
                        <Card
                            className="premium-card"
                            style={{
                                borderRadius: 24,
                                background: 'linear-gradient(135deg, #1890ff 0%, #001529 100%)',
                                border: 'none',
                                color: '#fff',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <Row gutter={24} align="middle">
                                    <Col span={16}>
                                        <Space direction="vertical" size={2}>
                                            <Tag color="#52c41a" style={{ borderRadius: 10, border: 'none' }}>ĐANG HOẠT ĐỘNG</Tag>
                                            <Title level={3} style={{ color: '#fff', margin: '12px 0 4px' }}>VinFast Landmark 81 - Trụ P-01</Title>
                                            <Text style={{ color: 'rgba(255,255,255,0.7)' }}><CarOutlined /> VinFast VF8 • 51A - 123.45</Text>
                                        </Space>
                                        <div style={{ marginTop: 32 }}>
                                            <Row gutter={40}>
                                                <Col>
                                                    <Statistic title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Công suất</span>} value={60} suffix="kW" valueStyle={{ color: '#fff' }} />
                                                </Col>
                                                <Col>
                                                    <Statistic title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Đã nạp</span>} value={32.5} suffix="kWh" valueStyle={{ color: '#fff' }} />
                                                </Col>
                                                <Col>
                                                    <Statistic title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Thời gian còn lại</span>} value={15} suffix="phút" valueStyle={{ color: '#faad14' }} />
                                                </Col>
                                            </Row>
                                        </div>
                                    </Col>
                                    <Col span={8} style={{ textAlign: 'center' }}>
                                        <Progress
                                            type="circle"
                                            percent={75}
                                            strokeColor="#52c41a"
                                            trailColor="rgba(255,255,255,0.1)"
                                            format={(percent) => <span style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{percent}%</span>}
                                            width={140}
                                            strokeWidth={10}
                                        />
                                    </Col>
                                </Row>
                            </div>
                            <ThunderboltOutlined style={{ position: 'absolute', right: -20, bottom: -20, fontSize: 200, color: 'rgba(255,255,255,0.05)' }} />
                        </Card>
                    </motion.div>

                    {/* Quick Stats Grid */}
                    <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                        <Col span={8}>
                            <Card style={{ borderRadius: 20, textAlign: 'center' }}>
                                <Statistic
                                    title="CO2 Tiết Kiệm"
                                    value={co2Saved}
                                    suffix="kg"
                                    prefix={<GlobalOutlined style={{ color: '#52c41a' }} />}
                                    valueStyle={{ color: '#3f8600' }}
                                />
                                <Text type="secondary" style={{ fontSize: 12 }}>≈ {Math.round(co2Saved / 20)} cây xanh 🌳</Text>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card style={{ borderRadius: 20, textAlign: 'center' }}>
                                <Statistic
                                    title="Tổng Năng Lượng"
                                    value={totalKwh}
                                    suffix="kWh"
                                    prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                                />
                                <Text type="secondary" style={{ fontSize: 12 }}><RiseOutlined /> {bookings.length} lượt sạc tiết kiệm</Text>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card style={{ borderRadius: 20, textAlign: 'center' }}>
                                <Statistic
                                    title="Hạng Thành Viên"
                                    value="Vàng"
                                    prefix={<StarFilled style={{ color: '#faad14' }} />}
                                />
                                <Progress percent={75} size="small" showInfo={false} strokeColor="#faad14" />
                            </Card>
                        </Col>
                    </Row>

                    {/* Consumption Chart */}
                    <Card title="Tiêu thụ năng lượng hàng tuần" style={{ marginTop: 24, borderRadius: 24 }}>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={finalDisplayData}>
                                    <defs>
                                        <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1890ff" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="kwh" stroke="#1890ff" strokeWidth={3} fillOpacity={1} fill="url(#colorKwh)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>

                {/* Sidebar Content */}
                <Col xs={24} lg={8}>
                    {/* Next Booking Card */}
                    <Card title="Lịch Sạc Sắp Tới" style={{ borderRadius: 24, marginBottom: 24 }}>
                        <div style={{ background: '#e6f7ff', padding: 16, borderRadius: 16, marginBottom: 16 }}>
                            <Row align="middle" gutter={12}>
                                <Col>
                                    <div style={{ width: 48, height: 48, background: '#1890ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CalendarOutlined style={{ color: '#fff', fontSize: 20 }} />
                                    </div>
                                </Col>
                                <Col flex="auto">
                                    {nextBooking ? (
                                        <>
                                            <Text strong style={{ display: 'block' }}>{dayjs(nextBooking.booking_date).format('DD/MM/YYYY')}, {nextBooking.start_time}</Text>
                                            <Text type="secondary" style={{ fontSize: 13 }}>{nextBooking.station_name}</Text>
                                        </>
                                    ) : (
                                        <Text type="secondary">Chưa có lịch sạc nào</Text>
                                    )}
                                </Col>
                                <Col>
                                    <ArrowRightOutlined />
                                </Col>
                            </Row>
                        </div>
                        <Button block size="large" onClick={() => navigate('/bookings')} style={{ borderRadius: 12 }}>Xem tất cả lịch đặt</Button>
                    </Card>

                    {/* Recommended Stations */}
                    <Card title="Trạm sạc dành cho bạn" style={{ borderRadius: 24 }}>
                        {recommended.length > 0 ? (
                            <List
                                itemLayout="horizontal"
                                dataSource={recommended}
                                renderItem={(item) => (
                                    <List.Item
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate('/map', { state: { openStationId: item.id } })}
                                        actions={[<Text type="secondary">{Number(item.distance || 0).toFixed(1)} km</Text>]}
                                    >
                                        <List.Item.Meta
                                            avatar={<Avatar style={{ backgroundColor: '#f0f2f5', color: '#1890ff' }} icon={<ThunderboltOutlined />} />}
                                            title={item.name}
                                            description={<Tag color={Number(item.available_chargers) > 0 ? 'green' : 'orange'}>{item.available_chargers}/{item.total_chargers} trống</Tag>}
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Không có gợi ý trạm sạc nào gần đây"
                            />
                        )}
                        <Button type="link" block style={{ marginTop: 12 }} onClick={() => navigate('/map')}>
                            Khám phá thêm trên bản đồ
                        </Button>
                    </Card>

                    {/* Community Support Card */}
                    <Card
                        style={{
                            marginTop: 24,
                            borderRadius: 24,
                            background: '#001529',
                            color: '#fff',
                            backgroundImage: 'url(https://www.transparenttextures.com/patterns/carbon-fibre.png)'
                        }}
                    >
                        <Title level={4} style={{ color: '#fff' }}>Hỗ Trợ Chuyển Đổi</Title>
                        <Paragraph style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Bạn đang có ý định đổi sang xe điện? Nhận ngay voucher 20tr VNĐ từ Chính phủ.
                        </Paragraph>
                        <Button type="primary" block ghost style={{ borderRadius: 10, borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => navigate('/support')}>
                            Tìm hiểu ngay
                        </Button>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default UserDashboard;

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Avatar, Button, Descriptions, Tag, Table, Statistic, Space, Progress, Divider } from 'antd';
import {
    UserOutlined,
    EditOutlined,
    ThunderboltOutlined,
    HistoryOutlined,
    SafetyCertificateOutlined,
    GlobalOutlined,
    ArrowUpOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';

import userService from '../../api/userService';

const { Title, Text } = Typography;

const UserProfile = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPersonalStats = async () => {
            try {
                const data = await userService.getPersonalAnalytics(user.id);
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch personal stats');
            } finally {
                setLoading(false);
            }
        };
        if (user?.id) fetchPersonalStats();
    }, [user]);

    const chargingHistory = [
        { key: '1', date: '2024-03-01', station: 'Landmark 81', kwh: 35.5, cost: '125,000đ', status: 'COMPLETED' },
        { key: '2', date: '2024-02-25', station: 'Vincom Mega Mall', kwh: 20.0, cost: '70,000đ', status: 'COMPLETED' },
        { key: '3', date: '2024-02-20', station: 'Lotte Mart Quận 7', kwh: 15.2, cost: '55,000đ', status: 'COMPLETED' },
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
            <Row gutter={[24, 24]}>
                {/* Profile Header */}
                <Col span={24}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={{ borderRadius: 24, padding: '20px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
                            <Row align="middle" gutter={24}>
                                <Col>
                                    <Avatar size={100} icon={<UserOutlined />} src="https://i.pravatar.cc/150?u=ev" />
                                </Col>
                                <Col flex="auto">
                                    <Title level={2} style={{ margin: 0 }}>{user?.full_name}</Title>
                                    <Space style={{ marginTop: 8 }}>
                                        <Tag color="gold" icon={<SafetyCertificateOutlined />}>Thành Viên Bạc</Tag>
                                        <Text type="secondary">{user?.email}</Text>
                                    </Space>
                                </Col>
                                <Col>
                                    <Button type="primary" icon={<EditOutlined />} shape="round" size="large">Chỉnh sửa hồ sơ</Button>
                                </Col>
                            </Row>
                        </Card>
                    </motion.div>
                </Col>

                {/* Left Column: Stats */}
                <Col xs={24} lg={16}>
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <Card style={{ borderRadius: 20, textAlign: 'center' }}>
                                <Statistic
                                    title="Tổng nạp (kWh)"
                                    value={stats?.summary?.total_kwh || 70.7}
                                    prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card style={{ borderRadius: 20, textAlign: 'center' }}>
                                <Statistic
                                    title="Tiết kiệm CO2"
                                    value={stats?.summary?.co2_saved || 28.3}
                                    suffix="kg"
                                    prefix={<GlobalOutlined style={{ color: '#52c41a' }} />}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card style={{ borderRadius: 20, textAlign: 'center' }}>
                                <Statistic
                                    title="Lượt sạc"
                                    value={stats?.summary?.total_sessions || 3}
                                    prefix={<HistoryOutlined style={{ color: '#faad14' }} />}
                                />
                            </Card>
                        </Col>

                        <Col span={24}>
                            <Card title="Xu hướng tiêu thụ năng lượng" style={{ borderRadius: 24 }}>
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.history || [
                                            { month: 'Jan', kwh: 30 },
                                            { month: 'Feb', kwh: 45 },
                                            { month: 'Mar', kwh: 70 }
                                        ]}>
                                            <defs>
                                                <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#1890ff" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="kwh" stroke="#1890ff" fillOpacity={1} fill="url(#colorKwh)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>

                        <Col span={24}>
                            <Card title="Lịch sử sạc gần đây" style={{ borderRadius: 24 }}>
                                <Table
                                    dataSource={chargingHistory}
                                    columns={[
                                        { title: 'Ngày', dataIndex: 'date', key: 'date' },
                                        { title: 'Trạm sạc', dataIndex: 'station', key: 'station' },
                                        { title: 'Sản lượng', dataIndex: 'kwh', key: 'kwh', render: (val) => `${val} kWh` },
                                        { title: 'Chi phí', dataIndex: 'cost', key: 'cost' },
                                        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (val) => <Tag color="green">THÀNH CÔNG</Tag> }
                                    ]}
                                    pagination={false}
                                />
                            </Card>
                        </Col>
                    </Row>
                </Col>

                {/* Right Column: Loyalty & Badges */}
                <Col xs={24} lg={8}>
                    <Card style={{ borderRadius: 24, marginBottom: 24 }}>
                        <Title level={4}>Thành tựu xanh 🌳</Title>
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text>Tiến trình lên hạng Vàng</Text>
                                    <Text strong>75%</Text>
                                </div>
                                <Progress percent={75} strokeColor="#faad14" showInfo={false} />
                            </div>

                            <Card size="small" style={{ background: '#f6ffed', border: 'none' }}>
                                <Space>
                                    <Avatar style={{ backgroundColor: '#52c41a' }} icon={<ThunderboltOutlined />} />
                                    <div>
                                        <Text strong block>Chiến binh sinh thái</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Đã giảm 50kg khí thải CO2</Text>
                                    </div>
                                </Space>
                            </Card>

                            <Card size="small" style={{ background: '#e6f7ff', border: 'none' }}>
                                <Space>
                                    <Avatar style={{ backgroundColor: '#1890ff' }} icon={<HistoryOutlined />} />
                                    <div>
                                        <Text strong block>Người dùng tích cực</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>30 ngày sử dụng liên tiếp</Text>
                                    </div>
                                </Space>
                            </Card>
                        </Space>
                    </Card>

                    <Card style={{ borderRadius: 24, background: 'linear-gradient(135deg, #1890ff 0%, #001529 100%)', color: '#fff' }}>
                        <Title level={4} style={{ color: '#fff' }}>Ưu đãi độc quyền</Title>
                        <Paragraph style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Bạn có 2 mã giảm giá 50% phí đặt chỗ trạm sạc nhanh.
                        </Paragraph>
                        <Button ghost block style={{ borderRadius: 12 }}>Xem ví voucher</Button>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default UserProfile;

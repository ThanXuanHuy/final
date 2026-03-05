import React, { useState } from 'react';
import { Row, Col, Card, Typography, Table, Tag, Button, Space, Modal, message, Statistic, Rate, Input } from 'antd';
import {
    CalendarOutlined,
    EnvironmentOutlined,
    ThunderboltOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

import bookingService from '../../api/bookingService';
import { useAuthStore } from '../../store/authStore';
import dayjs from 'dayjs';

const UserBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const { user } = useAuthStore();

    const fetchBookings = async () => {
        if (!user || !user.id) {
            console.log('User or User ID missing', user);
            return;
        }
        setLoading(true);
        try {
            console.log('Fetching bookings for user:', user.id);
            const data = await bookingService.getByUser(user.id);
            console.log('Bookings received:', data);
            setBookings(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch bookings error:', error);
            const errorMsg = error.response?.data?.error || error.message;
            message.error(`Lỗi: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchBookings();
    }, [user]);

    const handleCancel = (id) => {
        Modal.confirm({
            title: 'Hủy lịch sạc?',
            content: 'Bạn có chắc chắn muốn hủy lịch sạc này không? Thao tác này không thể hoàn tác.',
            okText: 'Hủy lịch',
            okType: 'danger',
            cancelText: 'Quay lại',
            onOk: async () => {
                try {
                    await bookingService.cancel(id);
                    message.success('Đã hủy lịch sạc thành công');
                    fetchBookings();
                } catch (error) {
                    message.error('Không thể hủy lịch sạc');
                }
            }
        });
    };

    const getStatusTag = (status) => {
        const config = {
            PENDING: { color: 'blue', label: 'Chờ xác nhận' },
            CONFIRMED: { color: 'cyan', label: 'Xác nhận' },
            CHARGING: { color: 'orange', label: 'Đang sạc' },
            COMPLETED: { color: 'green', label: 'Hoàn thành' },
            CANCELLED: { color: 'gray', label: 'Đã hủy' },
        };
        const item = config[status];
        return <Tag color={item.color}>{item.label.toUpperCase()}</Tag>;
    };

    const columns = [
        {
            title: 'Trạm & Trụ',
            key: 'station',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{r.station_name}</Text>
                    <Space style={{ fontSize: 12, color: '#8c8c8c' }}>
                        <EnvironmentOutlined /> {r.address}
                    </Space>
                    <Tag color="blue">{r.charger_type}</Tag>
                </Space>
            )
        },
        {
            title: 'Thời gian',
            key: 'time',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Space><CalendarOutlined /> {dayjs(r.booking_date).format('DD/MM/YYYY')}</Space>
                    <Space><ClockCircleOutlined /> {r.start_time} - {r.end_time || 'N/A'}</Space>
                </Space>
            )
        },
        { title: 'Chi phí dự kiến', dataIndex: 'cost', key: 'cost', render: (val) => <Text strong style={{ color: '#f5222d' }}>{Number(val).toLocaleString()}đ</Text> },
        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (status) => getStatusTag(status) },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    {(record.status === 'PENDING' || record.status === 'CONFIRMED') && (
                        <Button type="link" danger onClick={() => handleCancel(record.id)}>Hủy lịch</Button>
                    )}
                    {record.status === 'COMPLETED' && (
                        <Button type="link" onClick={() => {
                            setSelectedBooking(record);
                            setIsRatingModalOpen(true);
                        }}>Đánh giá</Button>
                    )}
                    <Button type="link">Chi tiết</Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Title level={2} style={{ marginBottom: 24 }}>Quản Lý Lịch Sạc Của Tôi</Title>

            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card style={{ borderRadius: 16, marginBottom: 24 }}>
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="Lịch sắp tới"
                                    value={bookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED').length}
                                    prefix={<CalendarOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Tổng lượt sạc"
                                    value={bookings.filter(b => b.status === 'COMPLETED').length}
                                    prefix={<ThunderboltOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Năng lượng (Dự kiến)"
                                    value={bookings.reduce((acc, b) => acc + (Number(b.estimated_kwh) || 0), 0).toFixed(1)}
                                    suffix="kWh"
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Tổng chi phí"
                                    value={bookings.reduce((acc, b) => acc + (Number(b.cost) || 0), 0)}
                                    suffix="đ"
                                    valueStyle={{ color: '#f5222d' }}
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Card style={{ borderRadius: 16 }}>
                        <Table
                            columns={columns}
                            dataSource={bookings}
                            rowKey="id"
                            loading={loading}
                            rowClassName={(record) => record.status === 'CANCELLED' ? 'row-cancelled' : ''}
                        />
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Đánh giá trạm sạc"
                open={isRatingModalOpen}
                onOk={() => {
                    message.success('Cảm ơn bạn đã đánh giá!');
                    setIsRatingModalOpen(false);
                }}
                onCancel={() => setIsRatingModalOpen(false)}
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text strong style={{ display: 'block', marginBottom: 12 }}>Bạn thấy trải nghiệm tại {selectedBooking?.station_name} thế nào?</Text>
                    <Rate defaultValue={5} style={{ fontSize: 32 }} />
                    <Input.TextArea
                        rows={4}
                        placeholder="Chia sẻ thêm cảm nhận của bạn (Ví dụ: Cơ sở vật chất, tốc độ sạc...)"
                        style={{ marginTop: 20 }}
                    />
                </div>
            </Modal>

            <style>{`
                .row-cancelled {
                    opacity: 0.6;
                }
            `}</style>
        </div>
    );
};

export default UserBookings;

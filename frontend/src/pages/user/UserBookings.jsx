import React, { useState } from 'react';
import { Row, Col, Card, Typography, Table, Tag, Button, Space, Modal, message, Statistic, Rate, Input, QRCode } from 'antd';
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
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const { user } = useAuthStore();

    const downloadQRCodeFromModal = () => {
        const canvas = document.getElementById('booking-qr-canvas')?.querySelector('canvas');
        if (canvas) {
            const url = canvas.toDataURL();
            const a = document.createElement('a');
            a.download = `Booking_QR_${selectedBooking?.id || ''}.png`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

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

    const handleCancel = (record) => {
        const now = dayjs();
        const startDateTime = dayjs(`${dayjs(record.booking_date).format('YYYY-MM-DD')} ${record.start_time}`, 'YYYY-MM-DD HH:mm:ss');

        const diffMinutes = startDateTime.diff(now, 'minute');
        if (diffMinutes < 30) {
            message.error('Đã quá thời gian cho phép hủy lịch. Bạn chỉ có thể hủy trước 30 phút.');
            return;
        }

        Modal.confirm({
            title: 'Hủy lịch sạc?',
            content: 'Bạn có chắc chắn muốn hủy lịch sạc này không? Thao tác này không thể hoàn tác.',
            okText: 'Hủy lịch',
            okType: 'danger',
            cancelText: 'Quay lại',
            onOk: async () => {
                try {
                    await bookingService.cancel(record.id);
                    message.success('Đã hủy lịch sạc thành công');
                    fetchBookings();
                } catch (error) {
                    message.error('Không thể hủy lịch sạc');
                }
            }
        });
    };

    const getComputedStatus = (record) => {
        return record.status;
    };

    const getStatusTag = (status) => {
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
        const item = config[status];
        if (item) {
            return <Tag color={item.color}>{item.label.toUpperCase()}</Tag>;
        }
        return <Tag color="default">{status}</Tag>;
    };

    const columns = [
        {
            title: 'Trạm & Trụ',
            key: 'station',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{r.station_name}</Text>
                    <Space style={{ fontSize: 12, color: '#8c8c8c' }}>
                        <EnvironmentOutlined /> {r.station_address}
                    </Space>
                    <Space size={4}>
                        <Tag color="blue">Cổng {r.port_number}</Tag>
                        <Tag color="cyan">{r.charger_type}</Tag>
                    </Space>
                </Space>
            )
        },
        {
            title: 'Thời gian',
            key: 'time',
            render: (_, r) => {
                const is24 = r.end_time === '24:00:00' || r.end_time === '24:00';
                const displayEndTime = is24 ? (r.end_time.length > 5 ? '00:00:00' : '00:00') : r.end_time;
                const isNextDay = (r.end_date && dayjs(r.end_date).isAfter(dayjs(r.booking_date), 'day')) || is24;

                return (
                    <Space direction="vertical" size={0}>
                        <Space><CalendarOutlined /> {dayjs(r.booking_date).format('DD/MM/YYYY')}</Space>
                        <Space>
                            <ClockCircleOutlined /> {r.start_time} - {displayEndTime || 'N/A'}
                            {isNextDay && (
                                <span style={{ fontSize: '12px', color: '#1890ff', marginLeft: 4 }}>(Hôm sau)</span>
                            )}
                        </Space>
                    </Space>
                );
            }
        },
        {
            title: 'Chi phí',
            key: 'cost',
            render: (_, record) => {
                let displayCost = Number(record.cost);
                if (record.actual_kwh != null && (record.status === 'COMPLETED' || record.status === 'PENDING_REFUND' || record.status === 'PENDING_PAYMENT')) {
                    const electricityCost = Math.round(Number(record.actual_kwh) * Number(record.price_per_kwh || 0));
                    displayCost = 20000 + electricityCost;
                }
                return <Text strong style={{ color: '#f5222d' }}>{displayCost.toLocaleString()}đ</Text>;
            }
        },
        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (_, record) => getStatusTag(getComputedStatus(record)) },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => {
                const computedStatus = getComputedStatus(record);
                const isCancellable = computedStatus === 'PENDING' ||
                    (computedStatus === 'CONFIRMED' && dayjs(`${dayjs(record.booking_date).format('YYYY-MM-DD')} ${record.start_time}`).diff(dayjs(), 'minute') > 30);

                return (
                    <Space>
                        {isCancellable && (
                            <Button type="link" danger onClick={() => handleCancel(record)}>Hủy lịch</Button>
                        )}
                        <Button type="link" onClick={() => {
                            setSelectedBooking(record);
                            setIsDetailsModalOpen(true);
                        }}>Chi tiết</Button>
                    </Space>
                );
            }
        }
    ];

    return (
        <div style={{ maxWidth: 1500, margin: '0 auto' }}>
            <Title level={2} style={{ marginBottom: 10 }}>Quản lý lịch sạc của tôi</Title>

            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card style={{ borderRadius: 16, marginBottom: 10 }}>
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
                                    title="Tổng năng lượng"
                                    value={bookings.filter(b => b.status !== 'CANCELLED' && !(b.status === 'PENDING_REFUND' && b.actual_kwh == null)).reduce((acc, b) => acc + (Number(b.estimated_kwh) || 0), 0).toFixed(1)}
                                    suffix="kWh"
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Tổng chi phí"
                                    value={bookings.filter(b => {
                                        if (b.status === 'CANCELLED') return false;
                                        if (b.status === 'PENDING_REFUND' && b.actual_kwh == null) return false;
                                        if (['PENDING', 'CONFIRMED', 'CHARGING'].includes(b.status)) return false;
                                        return true;
                                    }).reduce((acc, b) => {
                                        let cost = 0;
                                        if (b.status === 'EXPIRED') {
                                            cost = Number(b.cost) || 0;
                                        } else if (b.actual_kwh != null && (b.status === 'COMPLETED' || b.status === 'PENDING_REFUND' || b.status === 'PENDING_PAYMENT')) {
                                            const electricityCost = Math.round(Number(b.actual_kwh) * Number(b.price_per_kwh || 0));
                                            cost = 20000 + electricityCost;
                                        }
                                        return acc + cost;
                                    }, 0).toLocaleString()}
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
                            rowClassName={(record) => getComputedStatus(record) === 'CANCELLED' ? 'row-cancelled' : ''}
                        />
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Chi tiết lịch sạc"
                open={isDetailsModalOpen}
                onOk={() => setIsDetailsModalOpen(false)}
                onCancel={() => setIsDetailsModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsDetailsModalOpen(false)}>
                        Đóng
                    </Button>
                ]}
                width={500}
            >
                {selectedBooking && (
                    <div style={{ padding: '10px 0' }}>
                        <Card bordered={false} style={{ background: '#f5f5f5', borderRadius: 12, marginBottom: 16 }}>
                            <Title level={4} style={{ marginTop: 0, color: '#1890ff' }}>
                                {selectedBooking.station_name}
                            </Title>
                            <Text><EnvironmentOutlined /> {selectedBooking.station_address}</Text>
                        </Card>

                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Text type="secondary">Cổng sạc:</Text><br />
                                <Text strong>Cổng {selectedBooking.port_number} - {selectedBooking.charger_type}</Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Ngày sạc:</Text><br />
                                <Text strong>{dayjs(selectedBooking.booking_date).format('DD/MM/YYYY')}</Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Khung giờ đặt:</Text><br />
                                <Text strong>
                                    {(() => {
                                        const is24 = selectedBooking.end_time === '24:00:00' || selectedBooking.end_time === '24:00';
                                        const displayEndTime = is24 ? (selectedBooking.end_time.length > 5 ? '00:00:00' : '00:00') : selectedBooking.end_time;
                                        const isNextDay = (selectedBooking.end_date && dayjs(selectedBooking.end_date).isAfter(dayjs(selectedBooking.booking_date), 'day')) || is24;
                                        return (
                                            <>
                                                {selectedBooking.start_time} - {displayEndTime || 'N/A'}
                                                {isNextDay && (
                                                    <span style={{ fontSize: '12px', color: '#1890ff', marginLeft: 4 }}>(Hôm sau)</span>
                                                )}
                                            </>
                                        );
                                    })()}
                                </Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Phí đặt cọc:</Text><br />
                                <Text strong>{Number(selectedBooking.cost).toLocaleString()} đ</Text>
                            </Col>

                            {selectedBooking.status === 'COMPLETED' || selectedBooking.status === 'PENDING_REFUND' ? (
                                selectedBooking.actual_kwh && (
                                    <Col span={24}>
                                        <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f', marginTop: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <Title level={5} style={{ margin: 0, color: '#52c41a' }}>Hóa đơn thực tế</Title>
                                                <Tag color={selectedBooking.status === 'PENDING_REFUND' ? 'magenta' : 'success'}>
                                                    {selectedBooking.status === 'PENDING_REFUND' ? 'Chờ hoàn tiền' : 'Đã hoàn thành'}
                                                </Tag>
                                            </div>
                                            <Row gutter={[16, 16]}>
                                                <Col span={12}>
                                                    <Text type="secondary">Bắt đầu sạc:</Text><br />
                                                    <Text strong>{dayjs(selectedBooking.actual_start).format('HH:mm:ss')}</Text>
                                                </Col>
                                                <Col span={12}>
                                                    <Text type="secondary">Kết thúc sạc:</Text><br />
                                                    <Text strong>{selectedBooking.actual_end ? dayjs(selectedBooking.actual_end).format('HH:mm:ss') : 'Đang sạc...'}</Text>
                                                </Col>
                                                <Col span={12}>
                                                    <Text type="secondary">Điện năng tiêu thụ:</Text><br />
                                                    <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{selectedBooking.actual_kwh} kWh</Text>
                                                </Col>
                                                <Col span={12}>
                                                    <Text type="secondary">Tổng chi phí thực tế:</Text><br />
                                                    <Text strong style={{ color: '#f5222d', fontSize: 16 }}>
                                                        {(() => {
                                                            const electricityCost = Math.round(Number(selectedBooking.actual_kwh) * Number(selectedBooking.price_per_kwh || 0));
                                                            const totalActualCost = 20000 + electricityCost;
                                                            return `${totalActualCost.toLocaleString()} đ`;
                                                        })()}
                                                    </Text>
                                                </Col>
                                            </Row>
                                        </Card>
                                    </Col>
                                )
                            ) : null}

                            {getComputedStatus(selectedBooking) !== 'COMPLETED' && getComputedStatus(selectedBooking) !== 'PENDING_REFUND' && (
                                <>
                                    <Col span={12}>
                                        <Text type="secondary">Tổng chi phí dự tính:</Text><br />
                                        <Text strong style={{ color: '#f5222d', fontSize: 16 }}>
                                            {Number(selectedBooking.cost).toLocaleString()}đ
                                        </Text>
                                    </Col>
                                    <Col span={12}>
                                        <Text type="secondary">Trạng thái:</Text><br />
                                        {getStatusTag(getComputedStatus(selectedBooking))}
                                    </Col>
                                </>
                            )}
                        </Row>
                    </div>
                )}
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

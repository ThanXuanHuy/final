import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Typography, Card, Row, Col, Select, DatePicker, message, Popconfirm, Modal } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import bookingService from '../../api/bookingService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const AdminBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterDate, setFilterDate] = useState(null);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [selectedRefundBooking, setSelectedRefundBooking] = useState(null);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const data = await bookingService.getAll();
            setBookings(data);
        } catch (error) {
            message.error('Không thể tải danh sách lịch sạc');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const getComputedStatus = (booking) => {
        return booking.status;
    };

    const getStatusTag = (booking) => {
        const computed = getComputedStatus(booking);
        const config = {
            PENDING: { color: 'orange', label: 'ĐANG CHỜ' },
            CONFIRMED: { color: 'cyan', label: 'ĐÃ XÁC NHẬN' },
            CHARGING: { color: 'blue', label: 'ĐANG SẠC' },
            PENDING_PAYMENT: { color: 'volcano', label: 'CHỜ THANH TOÁN' },
            PENDING_REFUND: { color: 'magenta', label: 'CHỜ HOÀN TIỀN' },
            COMPLETED: { color: 'green', label: 'HOÀN THÀNH' },
            CANCELLED: { color: 'gray', label: 'ĐÃ HỦY' },
            EXPIRED: { color: 'red', label: 'QUÁ HẠN' },
        };
        const item = config[computed] || { color: 'default', label: computed };
        return <Tag color={item.color}>{item.label}</Tag>;
    };

    const handleDelete = async (id) => {
        try {
            await bookingService.delete(id);
            message.success('Đã xóa lịch sạc thành công');
            fetchBookings();
        } catch (error) {
            message.error('Không thể xóa lịch sạc');
        }
    };

    const handleRefund = async () => {
        if (!selectedRefundBooking) return;
        try {
            const nextStatus = selectedRefundBooking.actual_kwh ? 'COMPLETED' : 'CANCELLED';
            await bookingService.updateStatus(selectedRefundBooking.id, nextStatus);
            message.success('Đã xác nhận hoàn tiền');
            setIsRefundModalOpen(false);
            setSelectedRefundBooking(null);
            fetchBookings();
        } catch (error) {
            message.error('Không thể cập nhật trạng thái');
        }
    };

    const columns = [
        { title: 'Mã', dataIndex: 'id', key: 'id' },
        {
            title: 'Khách hàng',
            dataIndex: 'full_name',
            key: 'userName',
            render: (text) => <Text strong>{text || 'Ẩn danh'}</Text>
        },
        {
            title: 'Trạm / Trụ', key: 'stationInfo', render: (_, r) => (
                <div>
                    <div>{r.station_name}</div>
                    <Tag>Trụ {r.charger_id}</Tag>
                </div>
            )
        },
        { title: 'Ngày sạc', dataIndex: 'booking_date', key: 'date', render: (val) => dayjs(val).format('DD/MM/YYYY') },
        { title: 'Thời gian', key: 'time', render: (_, r) => `${r.start_time?.substring(0, 5)} - ${r.end_time?.substring(0, 5)}` },
        { title: 'Trạng thái', key: 'status', render: (_, record) => getStatusTag(record) },
        {
            title: 'Chi phí',
            key: 'cost',
            render: (_, record) => {
                let displayCost = Number(record.cost);
                if (record.actual_kwh != null && (record.status === 'COMPLETED' || record.status === 'PENDING_REFUND' || record.status === 'PENDING_PAYMENT')) {
                    const electricityCost = Math.round(Number(record.actual_kwh) * Number(record.price_per_kwh || 0));
                    displayCost = 20000 + electricityCost;
                }
                return `${displayCost.toLocaleString()}đ`;
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    {record.status === 'PENDING_REFUND' && (
                        <Button
                            size="small"
                            type="primary"
                            style={{ backgroundColor: '#eb2f96' }}
                            onClick={() => {
                                setSelectedRefundBooking(record);
                                setIsRefundModalOpen(true);
                            }}
                        >
                            Hoàn tiền
                        </Button>
                    )}
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa lịch sạc này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <div style={{ padding: '4px' }}>
            <Title level={2}>Quản lý lịch sạc</Title>

            <Card style={{ marginBottom: 24, borderRadius: 12 }}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Input
                            placeholder="Tìm mã lịch, khách hàng..."
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </Col>
                    <Col span={6}>
                        <Select
                            placeholder="Trạng thái"
                            style={{ width: '100%' }}
                            allowClear
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val)}
                        >
                            <Select.Option value="PENDING">Chờ xác nhận</Select.Option>
                            <Select.Option value="CONFIRMED">Đã xác nhận</Select.Option>
                            <Select.Option value="CHARGING">Đang sạc</Select.Option>
                            <Select.Option value="PENDING_PAYMENT">Chờ thanh toán</Select.Option>
                            <Select.Option value="PENDING_REFUND">Chờ hoàn tiền</Select.Option>
                            <Select.Option value="COMPLETED">Hoàn thành</Select.Option>
                            <Select.Option value="CANCELLED">Đã hủy</Select.Option>
                            <Select.Option value="EXPIRED">Quá hạn (Hủy)</Select.Option>
                        </Select>
                    </Col>
                    <Col span={6}>
                        <DatePicker
                            style={{ width: '100%' }}
                            placeholder="Chọn ngày"
                            value={filterDate}
                            onChange={(date) => setFilterDate(date)}
                        />
                    </Col>
                    <Col span={6}>
                        <Button icon={<FilterOutlined />} onClick={() => {
                            setSearchText('');
                            setFilterStatus(null);
                            setFilterDate(null);
                        }}>Xóa bộ lọc</Button>
                    </Col>
                </Row>
            </Card>

            <Card style={{ borderRadius: 12 }}>
                <Table
                    columns={columns}
                    dataSource={bookings.filter(b => {
                        const matchSearch = (b.id && b.id.toString().includes(searchText)) ||
                            (b.full_name && b.full_name.toLowerCase().includes(searchText.toLowerCase()));
                        const computedStatus = getComputedStatus(b);
                        const matchStatus = filterStatus ? computedStatus === filterStatus : true;
                        const matchDate = filterDate ? dayjs(b.booking_date).format('YYYY-MM-DD') === filterDate.format('YYYY-MM-DD') : true;
                        return matchSearch && matchStatus && matchDate;
                    })}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    loading={loading}
                />
            </Card>

            <Modal
                title="Xác nhận hoàn tiền"
                open={isRefundModalOpen}
                onCancel={() => {
                    setIsRefundModalOpen(false);
                    setSelectedRefundBooking(null);
                }}
                footer={[
                    <Button key="cancel" onClick={() => setIsRefundModalOpen(false)}>Hủy</Button>,
                    <Button key="submit" type="primary" style={{ backgroundColor: '#eb2f96' }} onClick={handleRefund}>
                        Xác nhận hoàn tiền
                    </Button>
                ]}
            >
                {selectedRefundBooking && (
                    <div>
                        <p><strong>Khách hàng:</strong> {selectedRefundBooking.full_name || 'Ẩn danh'}</p>
                        <p><strong>Trạm sạc:</strong> {selectedRefundBooking.station_name}</p>
                        <p><strong>Tiền cọc lúc đặt lịch:</strong> {Number(selectedRefundBooking.cost).toLocaleString()} đ</p>
                        <p><strong>Chi phí thực tế:</strong> {
                            (() => {
                                const electricityCost = Math.round(Number(selectedRefundBooking.actual_kwh || 0) * Number(selectedRefundBooking.price_per_kwh || 0));
                                const totalCost = 20000 + electricityCost;
                                return totalCost.toLocaleString() + ' đ';
                            })()
                        }</p>
                        <div style={{ marginTop: 16, padding: 12, background: '#fff0f6', border: '1px solid #ffadd2', borderRadius: 8 }}>
                            <Title level={5} style={{ color: '#eb2f96', margin: 0 }}>
                                Số tiền cần hoàn: {
                                    (() => {
                                        const electricityCost = Math.round(Number(selectedRefundBooking.actual_kwh || 0) * Number(selectedRefundBooking.price_per_kwh || 0));
                                        const totalCost = 20000 + electricityCost;
                                        const deposit = Number(selectedRefundBooking.cost);
                                        return (deposit - totalCost).toLocaleString();
                                    })()
                                } đ
                            </Title>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminBookings;

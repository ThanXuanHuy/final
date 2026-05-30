import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Typography, Card, Row, Col, Select, DatePicker, message, Popconfirm } from 'antd';
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

    const handleRefund = async (id) => {
        try {
            await bookingService.updateStatus(id, 'COMPLETED');
            message.success('Đã xác nhận hoàn tiền');
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
        {
            title: 'Thông số', key: 'stats', render: (_, r) => (
                <div style={{ fontSize: 12 }}>
                    <div>{Math.round(Number(r.estimated_kwh))} kWh</div>
                </div>
            )
        },
        { title: 'Trạng thái', key: 'status', render: (_, record) => getStatusTag(record) },
        { title: 'Chi phí', dataIndex: 'cost', key: 'totalCost', render: (val) => `${Number(val).toLocaleString()}đ` },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    {record.status === 'PENDING_REFUND' && (
                        <Popconfirm
                            title="Xác nhận đã hoàn tiền cho khách hàng này?"
                            onConfirm={() => handleRefund(record.id)}
                            okText="Đã hoàn"
                            cancelText="Hủy"
                        >
                            <Button size="small" type="primary" style={{ backgroundColor: '#eb2f96' }}>Hoàn tiền</Button>
                        </Popconfirm>
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
        </div>
    );
};

export default AdminBookings;

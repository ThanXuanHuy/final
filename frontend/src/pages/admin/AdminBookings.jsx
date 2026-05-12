import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Typography, Card, Row, Col, Select, DatePicker, message } from 'antd';
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

    const getStatusTag = (status) => {
        const config = {
            PENDING: { color: 'blue', label: 'CHỜ XÁC NHẬN' },
            CONFIRMED: { color: 'cyan', label: 'SẴN SÀNG' },
            CHARGING: { color: 'orange', label: 'ĐANG SẠC' },
            COMPLETED: { color: 'green', label: 'HOÀN THÀNH' },
            CANCELLED: { color: 'gray', label: 'ĐÃ HỦY' },
        };
        const item = config[status] || { color: 'default', label: status };
        return <Tag color={item.color}>{item.label}</Tag>;
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await bookingService.updateStatus(id, newStatus);
            message.success(`Đã cập nhật trạng thái lịch đặt`);
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
        { title: 'Bắt đầu', dataIndex: 'start_time', key: 'time' },
        {
            title: 'Thông số', key: 'stats', render: (_, r) => (
                <div style={{ fontSize: 12 }}>
                    <div>{r.estimated_kwh} kWh</div>
                </div>
            )
        },
        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (status) => getStatusTag(status) },
        { title: 'Chi phí', dataIndex: 'cost', key: 'totalCost', render: (val) => `${Number(val).toLocaleString()}đ` },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    {record.status === 'PENDING' && (
                        <Button size="small" type="primary" onClick={() => handleStatusChange(record.id, 'CONFIRMED')}>Xác nhận</Button>
                    )}
                    {record.status === 'CONFIRMED' && (
                        <Button size="small" type="primary" ghost onClick={() => handleStatusChange(record.id, 'CHARGING')}>Bắt đầu sạc</Button>
                    )}
                    {record.status === 'CHARGING' && (
                        <Button size="small" type="primary" ghost onClick={() => handleStatusChange(record.id, 'COMPLETED')}>Hoàn thành</Button>
                    )}
                    {(record.status === 'PENDING' || record.status === 'CONFIRMED') && (
                        <Button size="small" danger onClick={() => handleStatusChange(record.id, 'CANCELLED')}>Hủy</Button>
                    )}
                </Space>
            )
        },
    ];

    return (
        <div style={{ padding: '4px' }}>
            <Title level={2}>Quản Lý Lịch Sạc</Title>

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
                            <Select.Option value="CONFIRMED">Sẵn sàng</Select.Option>
                            <Select.Option value="CHARGING">Đang sạc</Select.Option>
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
                        const matchStatus = filterStatus ? b.status === filterStatus : true;
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

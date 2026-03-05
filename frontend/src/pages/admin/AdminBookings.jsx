import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Typography, Card, Row, Col, Select, DatePicker, message } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import bookingService from '../../api/bookingService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const initialBookings = [
    { id: 'BK001', userName: 'Nguyễn Văn A', stationName: 'VinFast Landmark 81', chargerId: 'P-01', time: '2024-03-22 10:00', duration: '60m', energy: '40 kWh', status: 'ready', totalCost: '124,000đ' },
    { id: 'BK002', userName: 'Trần Thị B', stationName: 'EV Thảo Điền', chargerId: 'P-05', time: '2024-03-22 11:30', duration: '30m', energy: '15 kWh', status: 'pending', totalCost: '48,000đ' },
    { id: 'BK003', userName: 'Lê Văn C', stationName: 'Trạm Quận 1', chargerId: 'P-02', time: '2024-03-21 18:00', duration: '45m', energy: '30 kWh', status: 'completed', totalCost: '90,000đ' },
    { id: 'BK004', userName: 'Phạm Văn D', stationName: 'Trạm Bình Thạnh', chargerId: 'P-03', time: '2024-03-22 14:00', duration: '60m', energy: '45 kWh', status: 'cancelled', totalCost: '0đ' },
];

const AdminBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);

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
                    <div>⚡ {r.estimated_kwh} kWh</div>
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
                        <Input placeholder="Tìm mã lịch, khách hàng..." prefix={<SearchOutlined />} />
                    </Col>
                    <Col span={6}>
                        <Select placeholder="Trạng thái" style={{ width: '100%' }} allowClear>
                            <Select.Option value="pending">Chờ xác nhận</Select.Option>
                            <Select.Option value="ready">Sẵn sàng</Select.Option>
                            <Select.Option value="charging">Đang sạc</Select.Option>
                            <Select.Option value="completed">Hoàn thành</Select.Option>
                        </Select>
                    </Col>
                    <Col span={6}>
                        <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày" />
                    </Col>
                    <Col span={6}>
                        <Button icon={<FilterOutlined />}>Lọc nâng cao</Button>
                    </Col>
                </Row>
            </Card>

            <Card style={{ borderRadius: 12 }}>
                <Table columns={columns} dataSource={bookings} rowKey="id" pagination={{ pageSize: 5 }} loading={loading} />
            </Card>
        </div>
    );
};

export default AdminBookings;

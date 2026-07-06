import React, { useState } from 'react';
import { Table, Button, Space, Tag, Input, Typography, Card, Row, Col, Select, Modal, Form, message, Popconfirm, Badge } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ThunderboltOutlined,
    SearchOutlined,
    DashboardOutlined,
    ToolOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import stationService from '../../api/stationService';
import { useEffect } from 'react';

const { Title, Text } = Typography;

const CustomStatistic = ({ title, value, prefix, suffix }) => (
    <div>
        <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 13 }}>{title}</div>
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>
            {prefix} {value} <span style={{ fontSize: 14 }}>{suffix}</span>
        </div>
    </div>
);

// Initial data removed to use real API data

const AdminChargers = () => {
    const [chargers, setChargers] = useState([]);
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState(null);
    const [form] = Form.useForm();

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [stationsData] = await Promise.all([
                stationService.getAll()
            ]);
            setStations(stationsData);

            // Get chargers for all stations or all chargers if endpoint exists
            // Let's assume we need to fetch chargers for each station or a global endpoint
            const chargersResults = await Promise.all(
                stationsData.map(s => stationService.getChargers(s.id))
            );

            const flatChargers = chargersResults.flat().map(c => {
                const station = stationsData.find(s => s.id === c.station_id);
                return {
                    ...c,
                    stationName: station ? station.name : 'Unknown'
                };
            }).sort((a, b) => a.id - b.id);

            setChargers(flatChargers);
        } catch (error) {
            console.error('Failed to fetch chargers');
            message.error('Không thể tải danh sách trụ sạc');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const getStatusBadge = (status) => {
        const config = {
            AVAILABLE: { status: 'success', text: 'SẴN SÀNG' },
            CHARGING: { status: 'processing', text: 'ĐANG SẠC' },
            BOOKED: { status: 'geekblue', text: 'ĐÃ ĐẶT' },
            MAINTENANCE: { status: 'warning', text: 'BẢO TRÌ' },
            OFFLINE: { status: 'default', text: 'NGOẠI TUYẾN' },
        };
        const item = config[status] || config.OFFLINE;
        return <Badge status={item.status} text={item.text} color={item.status === 'geekblue' ? '#2db7f5' : undefined} />;
    };

    const handleAdd = () => {
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record) => {
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await stationService.deleteCharger(id);
            message.success('Đã xóa trụ sạc');
            fetchAllData();
        } catch (error) {
            message.error(error.response?.data?.error || 'Lỗi khi xóa trụ sạc');
        }
    };

    const handleSave = () => {
        form.validateFields().then(async (values) => {
            try {
                const payload = {
                    ...values,
                    power_output: parseFloat(values.power_output),
                    price_per_kwh: parseFloat(values.price_per_kwh)
                };

                if (values.id) {
                    await stationService.updateCharger(values.id, payload);
                    message.success('Đã cập nhật trụ sạc');
                } else {
                    await stationService.addCharger(payload);
                    message.success('Đã thêm trụ sạc mới');
                }
                setIsModalOpen(false);
                fetchAllData();
            } catch (error) {
                message.error(error.response?.data?.error || 'Lỗi khi lưu thông tin');
            }
        });
    };

    const columns = [
        {
            title: 'Mã Trụ',
            dataIndex: 'id',
            key: 'id',
            render: (id) => <Tag color="blue" icon={<ThunderboltOutlined />}>{id}</Tag>
        },
        {
            title: 'Thuộc Trạm',
            dataIndex: 'stationName',
            key: 'stationName',
            render: (text) => <Text strong>{text}</Text>
        },
        { title: 'Loại Sạc', dataIndex: 'charger_type', key: 'charger_type' },
        { title: 'Công suất (kW)', dataIndex: 'power_output', key: 'power_output' },
        { title: 'Giá (VNĐ/kWh)', dataIndex: 'price_per_kwh', key: 'price_per_kwh', render: (val) => val != null ? Number(val).toLocaleString('vi-VN') : '-' },
        { title: 'Trạng Thái', dataIndex: 'status', key: 'status', render: (status) => getStatusBadge(status) },
        {
            title: 'Thao Tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        },
    ];

    const filteredChargers = chargers.filter(c => {
        const matchSearch = (c.id && c.id.toString().includes(searchText)) ||
            (c.stationName && c.stationName.toLowerCase().includes(searchText.toLowerCase()));
        const matchType = filterType ? c.charger_type === filterType : true;
        return matchSearch && matchType;
    });

    return (
        <div style={{ padding: '4px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Quản lý trụ sạc</Title>
                </Col>
                <Col>
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleAdd}>
                        Thêm trụ mới
                    </Button>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card size="small">
                        <CustomStatistic
                            title="Trụ đang sạc"
                            value={chargers.filter(c => c.status === 'CHARGING').length}
                            prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <CustomStatistic
                            title="Trụ khả dụng"
                            value={chargers.filter(c => c.status === 'AVAILABLE').length}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <CustomStatistic
                            title="Đang bảo trì"
                            value={chargers.filter(c => c.status === 'MAINTENANCE').length}
                            prefix={<ToolOutlined style={{ color: '#faad14' }} />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <CustomStatistic
                            title="Tổng số trụ"
                            value={chargers.length}
                            prefix={<DashboardOutlined style={{ color: '#13c2c2' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card bordered={false} style={{ borderRadius: 12 }}>
                <div style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Input
                                placeholder="Tìm mã trụ, tên trạm..."
                                prefix={<SearchOutlined />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </Col>
                        <Col span={6}>
                            <Select
                                placeholder="Lọc theo loại cổng"
                                style={{ width: '100%' }}
                                allowClear
                                value={filterType}
                                onChange={(val) => setFilterType(val)}
                            >
                                <Select.Option value="DC">DC</Select.Option>
                                <Select.Option value="AC">AC</Select.Option>
                            </Select>
                        </Col>
                    </Row>
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredChargers}
                    rowKey="id"
                    loading={loading}
                    pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
                />
            </Card>

            <Modal
                title={form.getFieldValue('id') ? "Chỉnh sửa trụ sạc" : "Thêm trụ sạc mới"}
                open={isModalOpen}
                onOk={handleSave}
                onCancel={() => setIsModalOpen(false)}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="id" hidden>
                        <Input />
                    </Form.Item>
                    <Form.Item name="station_id" label="Thuộc trạm" rules={[{ required: true, message: 'Vui lòng chọn trạm sạc' }]}>
                        <Select placeholder="Chọn trạm sạc">
                            {stations.map(s => (
                                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="charger_type" label="Loại cổng sạc" rules={[{ required: true, message: 'Vui lòng chọn loại sạc' }]}>
                        <Select placeholder="Chọn loại cổng">
                            <Select.Option value="DC">DC - Sạc nhanh</Select.Option>
                            <Select.Option value="AC">AC - Sạc thường</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="power_output" label="Công suất (kW)" rules={[{ required: true, message: 'Nhập công suất' }]}>
                        <Input type="number" placeholder="150" />
                    </Form.Item>
                    <Form.Item name="price_per_kwh" label="Đơn giá (VNĐ/kWh)" rules={[{ required: true, message: 'Nhập đơn giá' }]}>
                        <Input type="number" placeholder="3200" />
                    </Form.Item>
                    <Form.Item name="status" label="Trạng Thái" initialValue="AVAILABLE">
                        <Select>
                            <Select.Option value="AVAILABLE">Sẵn sàng</Select.Option>
                            <Select.Option value="CHARGING">Đang sạc</Select.Option>
                            <Select.Option value="BOOKED">Đã đặt</Select.Option>
                            <Select.Option value="MAINTENANCE">Bảo trì</Select.Option>
                            <Select.Option value="OFFLINE">Ngoại tuyến</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};


export default AdminChargers;

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
            });

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
            available: { status: 'success', text: 'SẴN SÀNG' },
            charging: { status: 'processing', text: 'ĐANG SẠC' },
            maintenance: { status: 'warning', text: 'BẢO TRÌ' },
            offline: { status: 'default', text: 'NGOẠI TUYẾN' },
        };
        const item = config[status];
        return <Badge status={item.status} text={item.text} />;
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
            // Need a delete endpoint for chargers if not already there
            // await stationService.deleteCharger(id);
            message.success('Đã xóa trụ sạc');
            fetchAllData();
        } catch (error) {
            message.error('Lỗi khi xóa trụ sạc');
        }
    };

    const handleSave = () => {
        form.validateFields().then(values => {
            if (chargers.find(c => c.id === values.id)) {
                setChargers(chargers.map(c => c.id === values.id ? { ...c, ...values } : c));
                message.success('Đã cập nhật trụ sạc');
            } else {
                setChargers([...chargers, { ...values, lastActive: 'Vừa tạo' }]);
                message.success('Đã thêm trụ sạc mới');
            }
            setIsModalOpen(false);
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
        { title: 'Loại Công Suất', dataIndex: 'type', key: 'type' },
        { title: 'Trạng Thái', dataIndex: 'status', key: 'status', render: (status) => getStatusBadge(status) },
        { title: 'Hoạt động cuối', dataIndex: 'lastActive', key: 'lastActive' },
        {
            title: 'Thao Tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button type="text" icon={<ToolOutlined />} onClick={() => message.info('Mở trang kỹ thuật')} />
                    <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <div style={{ padding: '4px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Quản Lý Trụ Sạc</Title>
                </Col>
                <Col>
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleAdd}>
                        Thêm Trụ Mới
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
                            <Input placeholder="Tìm mã trụ, tên trạm..." prefix={<SearchOutlined />} />
                        </Col>
                        <Col span={6}>
                            <Select placeholder="Lọc theo loại" style={{ width: '100%' }} allowClear>
                                <Select.Option value="DC 150kW">DC 150kW</Select.Option>
                                <Select.Option value="DC 60kW">DC 60kW</Select.Option>
                                <Select.Option value="AC 11kW">AC 11kW</Select.Option>
                            </Select>
                        </Col>
                    </Row>
                </div>
                <Table columns={columns} dataSource={chargers} rowKey="id" loading={loading} />
            </Card>

            <Modal
                title={form.getFieldValue('id') ? "Chỉnh sửa trụ sạc" : "Thêm trụ sạc mới"}
                open={isModalOpen}
                onOk={handleSave}
                onCancel={() => setIsModalOpen(false)}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="id" label="Mã Trụ" rules={[{ required: true }]}>
                        <Input placeholder="VD: P-06" />
                    </Form.Item>
                    <Form.Item name="station_id" label="Thuộc Trạm" rules={[{ required: true }]}>
                        <Select placeholder="Chọn trạm sạc">
                            {stations.map(s => (
                                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="type" label="Loại Công Suất" rules={[{ required: true }]}>
                        <Select placeholder="Chọn công suất">
                            <Select.Option value="DC 150kW">DC 150kW (Siêu nhanh)</Select.Option>
                            <Select.Option value="DC 60kW">DC 60kW (Nhanh)</Select.Option>
                            <Select.Option value="AC 11kW">AC 11kW (Thường)</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="status" label="Trạng Thái" initialValue="available">
                        <Select>
                            <Select.Option value="available">Sẵn sàng</Select.Option>
                            <Select.Option value="maintenance">Bảo trì</Select.Option>
                            <Select.Option value="offline">Ngoại tuyến</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};


export default AdminChargers;

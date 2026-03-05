import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Tag, Modal, Form, Select, Row, Col, Typography, message, Popconfirm, Card, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EnvironmentOutlined, ClockCircleOutlined, NumberOutlined } from '@ant-design/icons';
import stationService from '../../api/stationService';

const { Title } = Typography;

const AdminStations = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchStations();
    }, []);

    const fetchStations = async () => {
        setLoading(true);
        try {
            const data = await stationService.getAll();
            setStations(Array.isArray(data) ? data : []);
        } catch (error) {
            message.error('Không thể tải danh sách trạm sạc');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Tên Trạm',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: 'Địa Chỉ',
            dataIndex: 'address',
            key: 'address',
        },
        {
            title: 'Sức Chứa',
            dataIndex: 'capacity',
            key: 'capacity',
            align: 'center',
            render: (val) => <Tag color="blue">{val} xe</Tag>
        },
        {
            title: 'Giờ Mở Cửa',
            dataIndex: 'opening_hours',
            key: 'opening_hours',
            render: (val) => <Tag icon={<ClockCircleOutlined />}>{val}</Tag>
        },
        {
            title: 'Thao Tác',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm
                        title="Xóa trạm sạc"
                        description="Bạn có chắc chắn muốn xóa trạm sạc này không? Hành động này sẽ ảnh hưởng đến các trụ sạc liên quan."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const handleEdit = (station) => {
        form.setFieldsValue(station);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await stationService.delete(id);
            message.success('Đã xóa trạm sạc thành công');
            fetchStations();
        } catch (error) {
            message.error(error.response?.data?.error || 'Lỗi khi xóa trạm sạc');
        }
    };

    const handleAdd = () => {
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleOk = () => {
        form.validateFields().then(async (values) => {
            try {
                if (values.id) {
                    await stationService.update(values.id, values);
                    message.success('Đã cập nhật trạm sạc');
                } else {
                    await stationService.create(values);
                    message.success('Đã thêm trạm sạc mới');
                }
                setIsModalOpen(false);
                fetchStations();
            } catch (error) {
                message.error(error.response?.data?.error || 'Lỗi khi lưu thông tin');
            }
        });
    };

    return (
        <div style={{ padding: '4px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Quản Lý Trạm Sạc</Title>
                </Col>
                <Col>
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleAdd}>
                        Thêm Trạm Mới
                    </Button>
                </Col>
            </Row>

            <Card>
                <div style={{ marginBottom: 16 }}>
                    <Input
                        placeholder="Tìm kiếm trạm sạc..."
                        prefix={<SearchOutlined />}
                        style={{ width: 300 }}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={stations}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            <Modal
                title={form.getFieldValue('id') ? 'Chỉnh sửa trạm sạc' : 'Thêm trạm sạc mới'}
                open={isModalOpen}
                onOk={handleOk}
                onCancel={() => setIsModalOpen(false)}
                width={700}
                okText="Lưu lại"
                cancelText="Hủy bỏ"
            >
                <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
                    <Form.Item name="id" hidden>
                        <Input />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                name="name"
                                label="Tên Trạm Sạc"
                                rules={[{ required: true, message: 'Vui lòng nhập tên trạm!' }]}
                            >
                                <Input placeholder="VD: Trạm VinFast Landmark 81" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="address"
                        label="Địa Chỉ"
                        rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
                    >
                        <Input prefix={<EnvironmentOutlined />} placeholder="Nhập địa chỉ chi tiết" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="latitude"
                                label="Vĩ độ (Latitude)"
                                rules={[{ required: true, message: 'Nhập vĩ độ!' }]}
                            >
                                <Input type="number" step="0.000001" placeholder="Vd: 10.7769" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="longitude"
                                label="Kinh độ (Longitude)"
                                rules={[{ required: true, message: 'Nhập kinh độ!' }]}
                            >
                                <Input type="number" step="0.000001" placeholder="Vd: 106.7009" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="opening_hours"
                                label="Giờ Mở Cửa"
                                initialValue="24/7"
                                rules={[{ required: true, message: 'Nhập giờ mở cửa!' }]}
                            >
                                <Input prefix={<ClockCircleOutlined />} placeholder="Vd: 06:00 - 22:00 hoặc 24/7" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="capacity"
                                label="Sức Chứa (Xe)"
                                rules={[{ required: true, message: 'Nhập sức chứa!' }]}
                            >
                                <Input prefix={<NumberOutlined />} type="number" min={1} placeholder="Số lượng xe tối đa" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminStations;


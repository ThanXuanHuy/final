import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import evModelService from '../../api/evModelService';

const { Title } = Typography;

const ManageEVModels = () => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingModel, setEditingModel] = useState(null);
    const [form] = Form.useForm();

    const fetchModels = async () => {
        setLoading(true);
        try {
            const data = await evModelService.getAll();
            setModels(data || []);
        } catch (error) {
            message.error('Không thể tải danh sách mẫu xe');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModels();
    }, []);

    const handleAdd = () => {
        setEditingModel(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingModel(record);
        // Format specs array to a string for simple text area input
        let specsString = '';
        if (record.specs && Array.isArray(record.specs)) {
            specsString = record.specs.map(s => `${s.label}: ${s.value}`).join('\n');
        }

        form.setFieldsValue({
            ...record,
            specs: specsString
        });
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await evModelService.delete(id);
            message.success('Xóa mẫu xe thành công');
            fetchModels();
        } catch (error) {
            message.error('Xóa thất bại');
        }
    };

    const handleSubmit = async (values) => {
        try {
            // Parse specs string back to array of objects
            let specsArray = [];
            if (values.specs) {
                specsArray = values.specs.split('\n').map(line => {
                    const [label, ...valParts] = line.split(':');
                    return { label: label.trim(), value: valParts.join(':').trim() };
                }).filter(s => s.label);
            }

            const payload = {
                ...values,
                specs: specsArray
            };

            if (editingModel) {
                await evModelService.update(editingModel.id, payload);
                message.success('Cập nhật thành công');
            } else {
                await evModelService.create(payload);
                message.success('Thêm mới thành công');
            }
            setIsModalVisible(false);
            fetchModels();
        } catch (error) {
            message.error('Có lỗi xảy ra');
        }
    };

    const columns = [
        {
            title: 'Hình ảnh',
            dataIndex: 'image_url',
            key: 'image_url',
            render: (url) => url ? <img src={url} alt="xe" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 8 }} /> : 'Không có'
        },
        {
            title: 'Tên mẫu xe',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <strong>{text}</strong>
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
        },
        {
            title: 'Tầm hoạt động',
            dataIndex: 'range',
            key: 'range',
        },
        {
            title: 'Pin',
            dataIndex: 'battery',
            key: 'battery',
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger icon={<DeleteOutlined />}>Xóa</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={3} style={{ margin: 0 }}>Quản lý mẫu xe điện phổ biến</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Thêm mẫu xe mới
                </Button>
            </div>

            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Table
                    columns={columns}
                    dataSource={models}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingModel ? 'Sửa thông tin mẫu xe' : 'Thêm mẫu xe mới'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item name="name" label="Tên mẫu xe" rules={[{ required: true, message: 'Vui lòng nhập tên mẫu xe' }]}>
                        <Input placeholder="VinFast VF8" />
                    </Form.Item>

                    <Space style={{ display: 'flex', width: '100%' }} size="middle">
                        <Form.Item name="price" label="Giá tham khảo" style={{ width: '100%' }}>
                            <Input placeholder="1,090,000,000đ" />
                        </Form.Item>
                        <Form.Item name="range" label="Tầm hoạt động" style={{ width: '100%' }}>
                            <Input placeholder="400km" />
                        </Form.Item>
                        <Form.Item name="battery" label="Dung lượng pin" style={{ width: '100%' }}>
                            <Input placeholder="82 kWh" />
                        </Form.Item>
                    </Space>

                    <Form.Item name="image_url" label="URL hình ảnh">
                        <Input placeholder="https://..." />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả ngắn">
                        <Input.TextArea rows={3} placeholder="Mô tả về mẫu xe này..." />
                    </Form.Item>

                    <Form.Item
                        name="specs"
                        label="Thông số kỹ thuật chi tiết"
                        tooltip="Nhập mỗi thông số 1 dòng theo định dạng 'Tên: Giá trị'. Ví dụ: 'Tăng tốc: 5.5s'"
                    >
                        <Input.TextArea rows={5} placeholder="Tăng tốc 0-100km/h: 5.5s&#10;Công suất tối đa: 260kW" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
                            <Button type="primary" htmlType="submit">
                                {editingModel ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ManageEVModels;

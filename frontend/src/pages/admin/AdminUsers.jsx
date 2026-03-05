import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Typography, Card, Row, Col, Modal, Form, Select, message, Popconfirm, Avatar, Badge } from 'antd';
import {
    SearchOutlined,
    UserOutlined,
    LockOutlined,
    UnlockOutlined,
    EditOutlined,
    SafetyCertificateOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import userService from '../../api/userService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Mock data removed in favor of real API data

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getAll();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleStatusToggle = async (record) => {
        const newStatus = String(record.status).toLowerCase() === 'active' ? 'INACTIVE' : 'ACTIVE';
        try {
            await userService.updateStatus(record.id, newStatus);
            message.success(`Đã ${newStatus === 'ACTIVE' ? 'mở khóa' : 'khóa'} tài khoản`);
            fetchUsers();
        } catch (error) {
            message.error('Không thể cập nhật trạng thái');
        }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await userService.updateRole(id, newRole);
            message.success('Đã cập nhật quyền hạn');
            fetchUsers();
        } catch (error) {
            message.error('Không thể cập nhật quyền');
        }
    };

    const handleEdit = (record) => {
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        form.validateFields().then(values => {
            setUsers(users.map(u => u.id === values.id ? { ...u, ...values } : u));
            message.success('Cập nhật thông tin thành công');
            setIsModalOpen(false);
        });
    };

    const columns = [
        {
            title: 'Người dùng',
            key: 'user',
            render: (_, r) => (
                <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                        <div style={{ fontWeight: 'bold' }}>{r.full_name || 'Không tên'}</div>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.email}</div>
                    </div>
                </Space>
            )
        },
        { title: 'Điện thoại', dataIndex: 'phone', key: 'phone' },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role, record) => (
                <Select
                    value={role}
                    onChange={(val) => handleRoleChange(record.id, val)}
                    style={{ width: 100 }}
                    bordered={false}
                >
                    <Select.Option value="user">User</Select.Option>
                    <Select.Option value="admin">Admin</Select.Option>
                </Select>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const s = String(status || 'active').toLowerCase();
                return (
                    <Badge
                        status={s === 'active' ? 'success' : 'error'}
                        text={<Tag color={s === 'active' ? 'green' : 'red'}>{s.toUpperCase()}</Tag>}
                    />
                );
            }
        },
        {
            title: 'Ngày gia nhập',
            dataIndex: 'created_at',
            key: 'joinDate',
            render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '---'
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => {
                const active = String(record?.status || 'active').toLowerCase() === 'active';
                return (
                    <Space>
                        <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                        <Popconfirm
                            title={active ? "Khóa tài khoản này?" : "Mở khóa tài khoản này?"}
                            onConfirm={() => handleStatusToggle(record)}
                        >
                            <Button
                                type="text"
                                danger={active}
                                icon={active ? <LockOutlined /> : <UnlockOutlined />}
                            />
                        </Popconfirm>
                        <Popconfirm
                            title="Xóa vĩnh viễn người dùng này?"
                            okText="Xóa"
                            cancelText="Hủy"
                            onConfirm={() => message.warning('Chức năng xóa đã bị hạn chế')}
                        >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                );
            }
        }
    ];

    return (
        <div style={{ padding: '4px' }}>
            <Title level={2}>Quản Lý Người Dùng</Title>

            <Card style={{ marginBottom: 24, borderRadius: 12 }}>
                <Row gutter={16} align="middle">
                    <Col span={10}>
                        <Input placeholder="Tìm kiếm theo tên, email, số điện thoại..." prefix={<SearchOutlined />} size="large" />
                    </Col>
                    <Col span={6}>
                        <Select placeholder="Lọc vai trò" style={{ width: '100%' }} size="large" allowClear>
                            <Select.Option value="admin">Quản trị viên</Select.Option>
                            <Select.Option value="user">Khách hàng</Select.Option>
                        </Select>
                    </Col>
                    <Col span={8} style={{ textAlign: 'right' }}>
                        <Button type="primary" size="large" icon={<SafetyCertificateOutlined />}>Phân Quyền Hệ Thống</Button>
                    </Col>
                </Row>
            </Card>

            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table columns={columns} dataSource={users} rowKey="id" loading={loading} />
            </Card>

            <Modal
                title="Chỉnh sửa thông tin người dùng"
                open={isModalOpen}
                onOk={handleSave}
                onCancel={() => setIsModalOpen(false)}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
                    <Form.Item name="id" hidden><Input /></Form.Item>
                    <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="role" label="Vai trò">
                        <Select>
                            <Select.Option value="user">User</Select.Option>
                            <Select.Option value="admin">Admin</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminUsers;

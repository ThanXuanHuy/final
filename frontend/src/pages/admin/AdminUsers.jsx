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
    const [searchText, setSearchText] = useState('');
    const [filterRole, setFilterRole] = useState(null);

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

    const handleDelete = async (id) => {
        try {
            await userService.deleteUser(id);
            message.success('Đã xóa người dùng thành công');
            fetchUsers();
        } catch (error) {
            message.error(error.response?.data?.error || 'Không thể xóa người dùng');
        }
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
            render: (role) => (
                <Tag color={String(role).toLowerCase() === 'admin' ? 'gold' : 'blue'}>
                    {String(role).toUpperCase()}
                </Tag>
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
                            onConfirm={() => handleDelete(record.id)}
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
            <Title level={2}>Quản lý người dùng</Title>

            <Card style={{ marginBottom: 24, borderRadius: 12 }}>
                <Row gutter={16} align="middle">
                    <Col span={10}>
                        <Input
                            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                            prefix={<SearchOutlined />}
                            size="large"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </Col>
                    <Col span={6}>
                        <Select
                            placeholder="Lọc vai trò"
                            style={{ width: '100%' }}
                            size="large"
                            allowClear
                            value={filterRole}
                            onChange={(val) => setFilterRole(val)}
                        >
                            <Select.Option value="ADMIN">Quản trị viên</Select.Option>
                            <Select.Option value="USER">Khách hàng</Select.Option>
                        </Select>
                    </Col>
                    <Col span={8} style={{ textAlign: 'right' }}>
                        <Button type="default" size="large" icon={<SafetyCertificateOutlined />} onClick={() => {
                            setSearchText('');
                            setFilterRole(null);
                        }}>Xóa bộ lọc</Button>
                    </Col>
                </Row>
            </Card>

            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                    columns={columns}
                    dataSource={users.filter(u => {
                        const searchLower = searchText.toLowerCase();
                        const matchSearch = (u.full_name && u.full_name.toLowerCase().includes(searchLower)) ||
                            (u.email && u.email.toLowerCase().includes(searchLower)) ||
                            (u.phone && u.phone.includes(searchLower));
                        const matchRole = filterRole ? u.role === filterRole : true;
                        return matchSearch && matchRole;
                    })}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

        </div>
    );
};

export default AdminUsers;

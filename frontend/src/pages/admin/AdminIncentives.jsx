import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Typography, Card, Row, Col, message, Popconfirm, Modal, Form, Input, DatePicker, Tabs, Select } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    SearchOutlined
} from '@ant-design/icons';
import incentiveService from '../../api/incentiveService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const AdminIncentives = () => {
    const [registrations, setRegistrations] = useState([]);
    const [incentives, setIncentives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedReg, setSelectedReg] = useState(null);
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [isIncModalOpen, setIsIncModalOpen] = useState(false);
    const [editingIncentive, setEditingIncentive] = useState(null);
    const [searchRegText, setSearchRegText] = useState('');
    const [filterRegStatus, setFilterRegStatus] = useState('ALL');
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [regData, incData] = await Promise.all([
                incentiveService.getAllRegistrations(),
                incentiveService.getAll()
            ]);
            setRegistrations(regData);
            setIncentives(incData);
        } catch (error) {
            message.error('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusUpdate = async (id, status) => {
        try {
            await incentiveService.updateRegistrationStatus(id, status);
            message.success(`Đã cập nhật trạng thái: ${status}`);
            fetchData();
        } catch (error) {
            message.error('Lỗi khi cập nhật trạng thái');
        }
    };

    const handleCreateOrUpdateIncentive = async (values) => {
        try {
            const data = {
                ...values,
                active_from: values.dates[0].format('YYYY-MM-DD'),
                active_to: values.dates[1].format('YYYY-MM-DD'),
                subsidy_amount: Number(values.subsidy_amount)
            };
            if (editingIncentive) {
                await incentiveService.update(editingIncentive.id, data);
                message.success('Đã cập nhật chương trình ưu đãi');
            } else {
                await incentiveService.create(data);
                message.success('Đã tạo chương trình ưu đãi mới');
            }
            setIsIncModalOpen(false);
            setEditingIncentive(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Lỗi khi lưu chương trình');
        }
    };

    const handleDeleteIncentive = async (id) => {
        try {
            await incentiveService.delete(id);
            message.success('Đã xóa chương trình ưu đãi');
            fetchData();
        } catch (error) {
            message.error('Lỗi khi xóa');
        }
    };

    const handleDeleteRegistration = async (id) => {
        try {
            await incentiveService.deleteRegistration(id);
            message.success('Đã xóa hồ sơ đăng ký');
            fetchData();
        } catch (error) {
            message.error('Lỗi khi xóa hồ sơ');
        }
    };

    const openEditIncentive = (record) => {
        setEditingIncentive(record);
        form.setFieldsValue({
            title: record.title,
            description: record.description,
            subsidy_amount: record.subsidy_amount,
            conditions: record.conditions,
            dates: [dayjs(record.active_from), dayjs(record.active_to)]
        });
        setIsIncModalOpen(true);
    };

    const registrationColumns = [
        {
            title: 'Khách hàng',
            key: 'user',
            render: (_, r) => (
                <div>
                    <Text strong>{r.full_name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
                </div>
            )
        },
        { title: 'Chương trình', dataIndex: 'incentive_title', key: 'title' },
        {
            title: 'Ngày đăng ký',
            dataIndex: 'registration_date',
            key: 'date',
            render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm')
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'orange'}>
                    {status === 'APPROVED' ? 'Đã duyệt' : status === 'REJECTED' ? 'Từ chối' : 'Đang chờ'}
                </Tag>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => {
                            setSelectedReg(record);
                            setIsRegModalOpen(true);
                        }}
                    >
                        Chi tiết
                    </Button>
                    {record.status === 'PENDING' && (
                        <>
                            <Popconfirm title="Duyệt hồ sơ này?" onConfirm={() => handleStatusUpdate(record.id, 'APPROVED')}>
                                <Button type="primary" icon={<CheckCircleOutlined />} size="small" ghost>Duyệt</Button>
                            </Popconfirm>
                            <Popconfirm title="Từ chối hồ sơ này?" onConfirm={() => handleStatusUpdate(record.id, 'REJECTED')}>
                                <Button danger icon={<CloseCircleOutlined />} size="small">Từ chối</Button>
                            </Popconfirm>
                        </>
                    )}
                    <Popconfirm title="Xóa vĩnh viễn hồ sơ này?" onConfirm={() => handleDeleteRegistration(record.id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const incentiveColumns = [
        { title: 'Tên chương trình', dataIndex: 'title', key: 'title', render: (t) => <Text strong>{t}</Text> },
        {
            title: 'Số tiền hỗ trợ',
            dataIndex: 'subsidy_amount',
            key: 'amount',
            render: (val) => <Text style={{ color: '#f5222d' }}>{Number(val).toLocaleString()}đ</Text>
        },
        {
            title: 'Thời hạn',
            key: 'period',
            render: (_, r) => `${dayjs(r.active_from).format('DD/MM/YY')} - ${dayjs(r.active_to).format('DD/MM/YY')}`
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditIncentive(record)} />
                    <Popconfirm title="Xóa chương trình này?" onConfirm={() => handleDeleteIncentive(record.id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const filteredRegistrations = registrations.filter(r => {
        const matchName = r.full_name.toLowerCase().includes(searchRegText.toLowerCase());
        const matchEmail = r.email.toLowerCase().includes(searchRegText.toLowerCase());
        const matchStatus = filterRegStatus === 'ALL' || r.status === filterRegStatus;
        return (matchName || matchEmail) && matchStatus;
    });

    return (
        <div style={{ padding: '4px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Space align="center" size="middle">
                        <Title level={2} style={{ margin: 0 }}>Quản lý chương trình ưu đãi</Title>
                    </Space>
                </Col>
                <Col>
                    <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => {
                        setEditingIncentive(null);
                        form.resetFields();
                        setIsIncModalOpen(true);
                    }}>
                        Thêm mới ưu đãi
                    </Button>
                </Col>
            </Row>

            <Tabs defaultActiveKey="1" items={[
                {
                    key: '1',
                    label: 'Danh sách đăng ký',
                    children: (
                        <Card bordered={false} style={{ borderRadius: 12 }}>
                            <Space style={{ marginBottom: 16 }}>
                                <Input
                                    placeholder="Tìm theo tên/email..."
                                    prefix={<SearchOutlined />}
                                    value={searchRegText}
                                    onChange={e => setSearchRegText(e.target.value)}
                                    style={{ width: 250 }}
                                />
                                <Select
                                    value={filterRegStatus}
                                    onChange={setFilterRegStatus}
                                    style={{ width: 150 }}
                                    options={[
                                        { label: 'Tất cả trạng thái', value: 'ALL' },
                                        { label: 'Chờ duyệt', value: 'PENDING' },
                                        { label: 'Đã duyệt', value: 'APPROVED' },
                                        { label: 'Đã từ chối', value: 'REJECTED' }
                                    ]}
                                />
                            </Space>
                            <Table columns={registrationColumns} dataSource={filteredRegistrations} rowKey="id" loading={loading} />
                        </Card>
                    )
                },
                {
                    key: '2',
                    label: 'Chương trình ưu đãi',
                    children: (
                        <Card bordered={false} style={{ borderRadius: 12 }}>
                            <Table columns={incentiveColumns} dataSource={incentives} rowKey="id" loading={loading} />
                        </Card>
                    )
                }
            ]} />

            <Modal
                title="Chi tiết hồ sơ đăng ký"
                open={isRegModalOpen}
                onCancel={() => setIsRegModalOpen(false)}
                footer={null}
            >
                {selectedReg && (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <div>
                            <Text type="secondary">Khách hàng:</Text>
                            <br />
                            <Text strong>{selectedReg.full_name}</Text> ({selectedReg.email})
                        </div>
                        <div>
                            <Text type="secondary">Chương trình:</Text>
                            <br />
                            <Text strong>{selectedReg.incentive_title}</Text>
                        </div>
                        <div>
                            <Text type="secondary">Thông tin xe:</Text>
                            <br />
                            <Card size="small" style={{ background: '#f5f5f5' }}>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {JSON.stringify(JSON.parse(selectedReg.vehicle_info || '{}'), null, 2)}
                                </pre>
                            </Card>
                        </div>
                    </Space>
                )}
            </Modal>

            <Modal
                title={editingIncentive ? "Cập nhật chương trình ưu đãi" : "Tạo chương trình ưu đãi mới"}
                open={isIncModalOpen}
                onCancel={() => setIsIncModalOpen(false)}
                onOk={() => form.submit()}
                centered
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateOrUpdateIncentive} style={{ marginTop: 20 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="title" label="Tiêu đề">
                                <Input placeholder="Hỗ trợ 20tr đổi xe xăng sang điện" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="subsidy_amount" label="Số tiền hỗ trợ (VNĐ)">
                                <Input type="number" placeholder="3200" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="dates" label="Thời gian áp dụng">
                                <DatePicker.RangePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="conditions" label="Điều kiện áp dụng">
                                <Input placeholder="Các điều kiện kèm theo..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} placeholder="Mô tả chi tiết về chương trình ưu đãi" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminIncentives;

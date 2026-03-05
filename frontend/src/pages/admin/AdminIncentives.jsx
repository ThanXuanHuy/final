import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Typography, Card, Row, Col, message, Popconfirm, Badge, Modal, Form, Input, DatePicker, Tabs } from 'antd';
import {
    SafetyCertificateOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    PlusOutlined,
    DeleteOutlined
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

    const handleCreateIncentive = async (values) => {
        try {
            const data = {
                ...values,
                active_from: values.dates[0].format('YYYY-MM-DD'),
                active_to: values.dates[1].format('YYYY-MM-DD'),
                subsidy_amount: Number(values.subsidy_amount)
            };
            await incentiveService.create(data);
            message.success('Đã tạo chương trình ưu đãi mới');
            setIsIncModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Lỗi khi tạo chương trình');
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
                    {status}
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
                        </>
                    )}
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
                <Popconfirm title="Xóa chương trình này?" onConfirm={() => handleDeleteIncentive(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    return (
        <div style={{ padding: '4px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Space align="center" size="middle">
                        <Title level={2} style={{ margin: 0 }}>Quản Lý Hồ Sơ Hỗ Trợ</Title>
                        <Tag color="purple" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 8 }}>HỆ THỐNG QUẢN TRỊ</Tag>
                    </Space>
                </Col>
                <Col>
                    <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setIsIncModalOpen(true)}>
                        Tạo Ưu Đãi Mới
                    </Button>
                </Col>
            </Row>

            <Tabs defaultActiveKey="1" items={[
                {
                    key: '1',
                    label: 'Danh sách đăng ký',
                    children: (
                        <Card bordered={false} style={{ borderRadius: 12 }}>
                            <Table columns={registrationColumns} dataSource={registrations} rowKey="id" loading={loading} />
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
                title="Tạo chương trình ưu đãi mới"
                open={isIncModalOpen}
                onCancel={() => setIsIncModalOpen(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateIncentive} style={{ marginTop: 20 }}>
                    <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
                        <Input placeholder="VD: Hỗ trợ 20tr đổi xe máy xăng sang điện" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả" rules={[{ required: true }]}>
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="subsidy_amount" label="Số tiền hỗ trợ (VNĐ)" rules={[{ required: true }]}>
                        <Input type="number" prefix="đ" />
                    </Form.Item>
                    <Form.Item name="dates" label="Thời gian áp dụng" rules={[{ required: true }]}>
                        <DatePicker.RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="conditions" label="Điều kiện áp dụng">
                        <Input.TextArea rows={2} placeholder="Các điều kiện kèm theo..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminIncentives;

import React from 'react';
import { Col, Card, Form, Input, Select, Button, Alert } from 'antd';

const RegistrationForm = ({ form, incentives, evModels, loading, onFinish }) => {
    return (
        <Col xs={24} lg={8}>
            <Card title="Đăng ký hỗ trợ chuyển đổi xe" bordered={false} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                        <Input placeholder="Nguyễn Văn A" />
                    </Form.Item>
                    <Form.Item name="incentive_id" label="Chương trình ưu đãi" rules={[{ required: true, message: 'Vui lòng chọn chương trình ưu đãi' }]}>
                        <Select placeholder="Chọn chương trình muốn tham gia">
                            {incentives.map(i => (
                                <Select.Option key={i.id} value={i.id}>{i.title}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="oldVehicle" label="Loại phương tiện đang dùng" rules={[{ required: true, message: 'Vui lòng chọn loại phương tiện đang dùng' }]}>
                        <Select placeholder="Chọn loại xe đang dùng">
                            <Select.Option value="motorbike">Xe máy</Select.Option>
                            <Select.Option value="sedan">Ô tô</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="plate" label="Biển số xe" rules={[{ required: true, message: 'Vui lòng nhập biển số xe' }]}>
                        <Input placeholder="51A-123.45" />
                    </Form.Item>
                    <Form.Item name="newVehicle" label="Mẫu xe điện dự kiến đổi" rules={[{ required: true, message: 'Vui lòng chọn mẫu xe điện' }]}>
                        <Select placeholder="Chọn mẫu xe điện">
                            {evModels.map(model => (
                                <Select.Option key={model.id} value={model.name}>{model.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ marginTop: 16, height: 50, borderRadius: 10 }}>
                        Gửi hồ sơ đăng ký
                    </Button>
                </Form>
                <Alert
                    style={{ marginTop: 24 }}
                    message="Ưu đãi chuyển đổi phương tiện"
                    description="Người dùng đăng ký chuyển đổi từ xe xăng sang xe điện sẽ được hỗ trợ và nhận các ưu đãi hấp dẫn từ chương trình."
                    showIcon
                />
            </Card>
        </Col>
    );
};

export default RegistrationForm;

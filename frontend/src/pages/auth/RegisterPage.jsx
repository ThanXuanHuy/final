import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import authService from '../../api/authService';

const { Title, Text } = Typography;

const RegisterPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await authService.register({
                email: values.email,
                password: values.password,
                full_name: values.full_name,
                phone: values.phone
            });

            message.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
            navigate('/login');
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.error || 'Đăng ký thất bại. Email có thể đã tồn tại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card
                    style={{ width: 450, border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', borderRadius: 24 }}
                >
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: 16,
                            background: '#1890ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            boxShadow: '0 8px 16px rgba(24, 144, 255, 0.3)'
                        }}>
                            <ThunderboltOutlined style={{ fontSize: 32, color: '#fff' }} />
                        </div>
                        <Title level={2} style={{ marginBottom: 8 }}>Tham Gia EV Charging</Title>
                        <Text type="secondary">Tạo tài khoản để bắt đầu sạc xe nhanh chóng</Text>
                    </div>

                    <Form
                        name="register"
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                    >
                        <Form.Item
                            name="full_name"
                            label="Họ và tên"
                            rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Ví dụ: Nguyễn Văn A" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { required: true, message: 'Vui lòng nhập Email!' },
                                { type: 'email', message: 'Email không hợp lệ!' }
                            ]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="email@example.com" />
                        </Form.Item>

                        <Form.Item
                            name="phone"
                            label="Số điện thoại"
                            rules={[
                                { required: true, message: 'Vui lòng nhập số điện thoại!' },
                                { pattern: /^[0-9+]{10,11}$/, message: 'Số điện thoại không hợp lệ!' }
                            ]}
                        >
                            <Input prefix={<PhoneOutlined />} placeholder="0901234567" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                                { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên!' }
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
                        </Form.Item>

                        <Form.Item
                            name="confirm"
                            label="Xác nhận mật khẩu"
                            dependencies={['password']}
                            rules={[
                                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" />
                        </Form.Item>

                        <Form.Item style={{ marginTop: 24 }}>
                            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 50, borderRadius: 12, fontWeight: 600 }}>
                                Đăng ký tài khoản
                            </Button>
                        </Form.Item>
                    </Form>

                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Text type="secondary">Đã có tài khoản? </Text>
                        <Button type="link" onClick={() => navigate('/login')} style={{ padding: 0 }}>Đăng nhập ngay</Button>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};

export default RegisterPage;

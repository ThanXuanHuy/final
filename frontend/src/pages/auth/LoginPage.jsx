import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import authService from '../../api/authService';

const { Title, Text } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await authService.login({
                email: values.email,
                password: values.password
            });

            const { token, user } = response;
            login(user, token);

            message.success(`Chào mừng trở lại, ${user.full_name || user.email}!`);

            if (user.role?.toLowerCase() === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
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
                    className="glass-card"
                    style={{ width: 400, border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                >
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: 16,
                            background: 'var(--primary-gradient)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            boxShadow: '0 8px 16px rgba(24, 144, 255, 0.3)'
                        }}>
                            <ThunderboltOutlined style={{ fontSize: 32, color: '#fff' }} />
                        </div>
                        <Title level={2} style={{ marginBottom: 8 }}>EV Charging</Title>
                        <Text type="secondary">Đăng nhập để tiếp tục</Text>
                    </div>

                    <Form
                        name="login"
                        initialValues={{ remember: true }}
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                    >
                        <Form.Item
                            name="email"
                            rules={[{ required: true, message: 'Vui lòng nhập Email!', type: 'email' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Email đăng nhập" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" block loading={loading}>
                                Đăng nhập
                            </Button>
                        </Form.Item>
                    </Form>

                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Text type="secondary">Chưa có tài khoản? </Text>
                        <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/register')}>Đăng ký ngay</Button>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};

export default LoginPage;

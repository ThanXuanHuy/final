import React from 'react';
import { Row, Col, Card, Typography, Tag, Space } from 'antd';
import {
    ThunderboltFilled,
    CheckCircleFilled,
    SafetyCertificateFilled
} from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Title, Paragraph } = Typography;

const HeroSection = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
                marginBottom: 48,
                background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)',
                padding: '40px 32px',
                borderRadius: 32,
                boxShadow: '0 20px 40px rgba(24, 144, 255, 0.05)',
                border: '1px solid rgba(24, 144, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Decorative background shapes */}
            <div style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, background: 'rgba(24, 144, 255, 0.1)', filter: 'blur(80px)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: -100, right: -100, width: 300, height: 300, background: 'rgba(82, 196, 26, 0.08)', filter: 'blur(80px)', borderRadius: '50%' }}></div>

            <Row gutter={[32, 32]} align="middle" style={{ position: 'relative', zIndex: 1 }}>
                <Col xs={24} lg={12} style={{ textAlign: 'left' }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                    </motion.div>

                    <Title level={1} style={{
                        fontSize: 45,
                        fontWeight: 800,
                        marginBottom: 24,
                        background: 'linear-gradient(90deg, #1890ff, #52c41a)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'inline-block'
                    }}>
                        Hỗ trợ chuyển đổi phương tiện
                    </Title>

                    <Paragraph style={{
                        fontSize: 18,
                        color: '#595959',
                        lineHeight: 1.8,
                        marginBottom: 32
                    }}>
                        Khám phá các ưu đãi tài chính và dịch vụ khi đổi xe xăng sang xe điện.
                        So sánh chi phí vận hành, tìm hiểu các mẫu xe điện phù hợp và nhận những hỗ trợ hấp dẫn từ Chính phủ và các đối tác.
                        Bắt đầu chuyển đổi xanh ngay hôm nay để tiết kiệm chi phí và góp phần bảo vệ môi trường!
                    </Paragraph>
                </Col>

                <Col xs={24} lg={12} style={{ textAlign: 'center' }}>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        style={{ position: 'relative', display: 'inline-block', padding: 10 }}
                    >
                        <div style={{
                            width: 280, height: 280, background: 'linear-gradient(135deg, #1890ff 0%, #52c41a 100%)',
                            borderRadius: '50%', position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)', opacity: 0.15, filter: 'blur(30px)'
                        }}></div>

                        <div style={{
                            width: 220, height: 220, background: 'white', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.08)', position: 'relative', zIndex: 2,
                            border: '4px solid #f0f5ff'
                        }}>
                            <ThunderboltFilled style={{ fontSize: 110, color: '#52c41a' }} />
                        </div>

                        <Card style={{ position: 'absolute', top: 10, right: -20, zIndex: 3, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: 0 }} bodyStyle={{ padding: '10px 10px' }}>
                            <Space>
                                <CheckCircleFilled style={{ color: '#1890ff', fontSize: 28 }} />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold', color: '#1890ff', fontSize: 16 }}>Tiết kiệm 40%</div>
                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>Chi phí vận hành</div>
                                </div>
                            </Space>
                        </Card>

                        <Card style={{ position: 'absolute', bottom: 10, left: -20, zIndex: 3, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: 0 }} bodyStyle={{ padding: '10px 10px' }}>
                            <Space>
                                <SafetyCertificateFilled style={{ color: '#52c41a', fontSize: 28 }} />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold', color: '#52c41a', fontSize: 16 }}>100% Sạch</div>
                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>Không phát thải</div>
                                </div>
                            </Space>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </motion.div>
    );
};

export default HeroSection;

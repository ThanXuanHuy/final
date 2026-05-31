import React from 'react';
import { Row, Col, Card, Typography, Alert } from 'antd';
import {
    CheckCircleOutlined,
    SafetyCertificateOutlined,
    DollarOutlined,
    GlobalOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

const IncentivesSection = ({ incentives }) => {
    return (
        <Col span={24} id="benefits">
            <Title level={2}><CheckCircleOutlined /> Chính sách ưu đãi hiện tại</Title>
            <Row gutter={[16, 16]}>
                {incentives.length > 0 ? incentives.map((item, index) => (
                    <Col xs={24} md={8} key={index}>
                        <motion.div whileHover={{ y: -5 }}>
                            <Card hoverable style={{ minHeight: 220, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: 20 }}>
                                <div style={{ fontSize: 32, marginBottom: 10 }}>
                                    {index % 3 === 0 ? <SafetyCertificateOutlined style={{ color: '#52c41a' }} /> :
                                        index % 3 === 1 ? <DollarOutlined style={{ color: '#1890ff' }} /> :
                                            <GlobalOutlined style={{ color: '#faad14' }} />}
                                </div>
                                <Title level={4}>{item.title}</Title>
                                <Text strong style={{ color: '#f5222d', display: 'block', marginBottom: 8 }}>
                                    Hỗ trợ: {Number(item.subsidy_amount).toLocaleString()}đ
                                </Text>
                                <Text type="secondary">{item.description}</Text>
                            </Card>
                        </motion.div>
                    </Col>
                )) : (
                    <Col span={24}><Alert message="Hiện chưa có chương trình ưu đãi mới nào." type="info" /></Col>
                )}
            </Row>
        </Col>
    );
};

export default IncentivesSection;

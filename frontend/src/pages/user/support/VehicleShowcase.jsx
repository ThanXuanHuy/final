import React, { useState } from 'react';
import { Row, Col, Card, Typography, Button, Modal, Statistic, List, Tag } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

const VehicleShowcase = ({ evModels }) => {
    const [selectedCar, setSelectedCar] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = (car) => {
        setSelectedCar(car);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <Col span={24}>
            <div style={{ marginBottom: 10 }}>
                <Title level={2} style={{ marginBottom: 10, fontSize: 36 }}>Các mẫu xe điện phổ biến</Title>
                <Row gutter={[24, 24]}>
                    {evModels.map((car, index) => (
                        <Col xs={24} sm={12} lg={6} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                style={{ height: '100%' }}
                            >
                                <Card
                                    hoverable
                                    cover={
                                        car.image_url ? (
                                            <img alt={car.name} src={car.image_url} style={{ height: 200, objectFit: 'cover' }} />
                                        ) : null
                                    }
                                    style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden' }}
                                    bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                >
                                    <Title level={4}>{car.name}</Title>
                                    <div style={{ marginBottom: 16 }}>
                                        <Text type="secondary" style={{ display: 'block' }}>Giá từ</Text>
                                        <Text strong style={{ fontSize: 20, color: '#f5222d' }}>{car.price}</Text>
                                    </div>
                                    <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                                        <Col span={12}>
                                            <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Tầm hoạt động</Text>
                                                <Text strong>{car.range}</Text>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Pin</Text>
                                                <Text strong>{car.battery}</Text>
                                            </div>
                                        </Col>
                                    </Row>
                                    <Button
                                        type="primary"
                                        block
                                        style={{ marginTop: 'auto', borderRadius: 10 }}
                                        onClick={() => handleOpenModal(car)}
                                    >
                                        Xem chi tiết
                                    </Button>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>
            </div>

            {/* Vehicle Detail Modal */}
            <Modal
                title={<Title level={3} style={{ margin: 0 }}>{selectedCar?.name}</Title>}
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={[
                    <Button key="close" type="primary" size="large" onClick={handleCloseModal} style={{ borderRadius: 10 }}>
                        Đóng
                    </Button>
                ]}
                width={700}
                centered
                style={{ borderRadius: 24 }}
            >
                {selectedCar && (
                    <Row gutter={[24, 24]}>
                        <Col span={24}>
                            {selectedCar.image_url && (
                                <img
                                    src={selectedCar.image_url}
                                    alt={selectedCar.name}
                                    style={{ width: '100%', borderRadius: 20, marginBottom: 20 }}
                                />
                            )}
                            <Paragraph style={{ fontSize: 16, lineHeight: '1.6' }}>
                                {selectedCar.description}
                            </Paragraph>
                        </Col>
                        <Col span={12}>
                            <Card size="small" title="Thông số pin & Quãng đường" bordered={false} style={{ background: '#f6ffed', borderRadius: 16 }}>
                                <Statistic title="Dung lượng pin" value={selectedCar.battery} />
                                <Statistic title="Quãng đường (WLTP)" value={selectedCar.range} icon={<ArrowRightOutlined />} style={{ marginTop: 12 }} />
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card size="small" title="Giá niêm yết" bordered={false} style={{ background: '#fff1f0', borderRadius: 16 }}>
                                <Statistic title="Giá khởi điểm" value={selectedCar.price} valueStyle={{ color: '#f5222d' }} />
                                <div style={{ marginTop: 12 }}>
                                    <Tag color="green">Miễn 100% lệ phí trước bạ</Tag>
                                </div>
                            </Card>
                        </Col>
                        <Col span={24}>
                            <Title level={4}>Thông số kỹ thuật khác</Title>
                            <List
                                size="small"
                                dataSource={selectedCar.specs}
                                renderItem={item => (
                                    <List.Item>
                                        <Text type="secondary">{item.label}</Text>
                                        <Text strong>{item.value}</Text>
                                    </List.Item>
                                )}
                            />
                        </Col>
                    </Row>
                )}
            </Modal>
        </Col>
    );
};

export default VehicleShowcase;

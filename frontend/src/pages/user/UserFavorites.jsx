import React from 'react';
import { Row, Col, Card, Typography, Button, Empty, Space, Tag, Rate, message } from 'antd';
import {
    HeartFilled,
    EnvironmentOutlined,
    ThunderboltOutlined,
    StarFilled,
    ArrowRightOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import stationService from '../../api/stationService';
import { useState, useEffect } from 'react';

const { Title, Text } = Typography;

const UserFavorites = () => {
    const navigate = useNavigate();
    const { favorites, toggleFavorite } = useAuthStore();
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchStations = async () => {
            setLoading(true);
            try {
                const data = await stationService.getAll();
                setStations(data);
            } catch (error) {
                console.error('Failed to fetch stations');
            } finally {
                setLoading(false);
            }
        };
        fetchStations();
    }, []);

    // Filter stations that are in favorites
    const favoriteStations = stations.filter(s => favorites.includes(String(s.id)) || favorites.includes(Number(s.id)));

    const handleRemove = (id) => {
        toggleFavorite(id);
        message.info('Đã xóa khỏi danh sách yêu thích');
    };

    return (
        <div style={{ padding: '20px 0' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 40 }}
            >
                <Title level={2} style={{ fontWeight: 800 }}>Trạm Sạc Yêu Thích </Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                    Dưới đây là các trạm sạc bạn đã lưu để truy cập nhanh chóng.
                </Text>
            </motion.div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px 0' }}><Text>Đang tải...</Text></div>
            ) : favoriteStations.length > 0 ? (
                <Row gutter={[24, 24]}>
                    <AnimatePresence>
                        {favoriteStations.map((station) => (
                            <Col xs={24} md={12} lg={8} key={station.id}>
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -8 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Card
                                        hoverable
                                        style={{ border: 'none', borderRadius: 24, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
                                        cover={
                                            <div style={{ position: 'relative' }}>
                                                <img
                                                    alt="station"
                                                    src={`https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=400&q=80`}
                                                    style={{ height: 200, width: '100%', objectFit: 'cover' }}
                                                />
                                                <Button
                                                    type="primary"
                                                    danger
                                                    shape="circle"
                                                    icon={<HeartFilled />}
                                                    style={{ position: 'absolute', top: 16, right: 16 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemove(station.id);
                                                    }}
                                                />
                                            </div>
                                        }
                                    >
                                        <Title level={4} style={{ marginBottom: 8 }}>{station.name}</Title>
                                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                            <EnvironmentOutlined /> {station.address}
                                        </Text>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                            <Space>
                                                <Tag color="blue" icon={<ThunderboltOutlined />}>{station.type === 'fast' ? 'Sạc Nhanh' : 'Sạc Thường'}</Tag>
                                                <Space size={4}>
                                                    <StarFilled style={{ color: '#faad14' }} />
                                                    <Text strong>{station.rating}</Text>
                                                </Space>
                                            </Space>
                                            <Text strong style={{ color: '#f5222d', fontSize: 18 }}>{station.price}đ</Text>
                                        </div>

                                        <Button
                                            type="primary"
                                            block
                                            size="large"
                                            icon={<ArrowRightOutlined />}
                                            onClick={() => navigate('/map', { state: { openStationId: station.id } })}
                                            style={{ borderRadius: 12, height: 48 }}
                                        >
                                            Xem trên bản đồ
                                        </Button>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </AnimatePresence>
                </Row>
            ) : (
                <Card style={{ textAlign: 'center', padding: '60px 0', borderRadius: 24, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <Space direction="vertical">
                                <Text type="secondary" style={{ fontSize: 16 }}>Bạn chưa có trạm sạc yêu thích nào.</Text>
                                <Button type="primary" onClick={() => navigate('/map')} style={{ marginTop: 16, borderRadius: 10 }}>Khám phá ngay</Button>
                            </Space>
                        }
                    />
                </Card>
            )}
        </div>
    );
};

export default UserFavorites;

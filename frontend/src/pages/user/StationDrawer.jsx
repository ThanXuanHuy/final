import React from 'react';
import {
    Drawer, Card, Row, Col, Button, Typography, Tag, Space, Statistic
} from 'antd';
import {
    ThunderboltOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    HeartOutlined,
    HeartFilled
} from '@ant-design/icons';
import { message } from 'antd';

const { Title, Text } = Typography;

const getChargerStatusConfig = (status) => {
    switch (status) {
        case 'AVAILABLE': return { label: 'TRỐNG', tagColor: 'success', bgColor: '#f6ffed', borderColor: '#b7eb8f', iconColor: '#52c41a' };
        case 'CHARGING': return { label: 'ĐANG SẠC', tagColor: 'processing', bgColor: '#e6f7ff', borderColor: '#91caff', iconColor: '#1677ff' };
        case 'BOOKED': return { label: 'ĐÃ ĐẶT', tagColor: 'geekblue', bgColor: '#e6f4ff', borderColor: '#69b1ff', iconColor: '#2f54eb' };
        case 'MAINTENANCE': return { label: 'BẢO TRÌ', tagColor: 'warning', bgColor: '#fffbe6', borderColor: '#ffe58f', iconColor: '#faad14' };
        case 'OFFLINE': return { label: 'NGOẠI TUYẾN', tagColor: 'default', bgColor: '#fafafa', borderColor: '#d9d9d9', iconColor: '#8c8c8c' };
        default: return { label: 'KHÔNG RÕ', tagColor: 'default', bgColor: '#fafafa', borderColor: '#d9d9d9', iconColor: '#8c8c8c' };
    }
};

const StationDrawer = ({
    visible,
    selectedStation,
    chargers,
    routeInfo,
    routingLoading,
    favorites,
    user,
    onClose,
    onDrawRoute,
    onBooking,
    onToggleFavorite,
}) => {
    return (
        <Drawer
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', paddingRight: 24 }}>
                    <Space>
                        <ThunderboltOutlined style={{ color: '#faad14' }} />
                        <span>Chi tiết trạm sạc</span>
                    </Space>
                    {selectedStation && (
                        <Button
                            type="text"
                            icon={favorites.includes(selectedStation.id)
                                ? <HeartFilled style={{ color: '#ff4d4f' }} />
                                : <HeartOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!user) {
                                    message.error('Vui lòng đăng nhập để thêm vào danh sách yêu thích');
                                    return;
                                }
                                onToggleFavorite(selectedStation.id);
                                if (!favorites.includes(selectedStation.id)) {
                                    message.success('Đã thêm vào danh sách yêu thích');
                                } else {
                                    message.info('Đã xóa khỏi danh sách yêu thích');
                                }
                            }}
                        />
                    )}
                </div>
            }
            placement="right"
            onClose={onClose}
            open={visible}
            width={480}
            headerStyle={{ borderBottom: 'none' }}
            style={{ padding: '0 24px 24px' }}
        >
            {selectedStation && (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <img
                        src={selectedStation.image_url || `https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80`}
                        alt={selectedStation.name}
                        style={{ width: '100%', borderRadius: 24, height: 240, objectFit: 'cover' }}
                    />

                    <section>
                        <Title level={3} style={{ marginBottom: 4 }}>{selectedStation.name}</Title>
                        <Text type="secondary"><EnvironmentOutlined /> {selectedStation.address}</Text>

                        <Card style={{ borderRadius: 20, marginTop: 20, background: '#f9f9f9', border: 'none' }}>
                            <Row gutter={16}>
                                <Col span={14}>
                                    <Statistic
                                        title="Giá sạc (từ)"
                                        value={selectedStation.price ? Number(selectedStation.price) : 'Chưa cập nhật'}
                                        suffix={selectedStation.price ? "đ" : ""}
                                        valueStyle={{ color: '#f5222d', fontSize: 18, whiteSpace: 'nowrap' }}
                                        titleStyle={{ whiteSpace: 'nowrap' }}
                                    />
                                </Col>
                                <Col span={10}>
                                    <Statistic
                                        title="Tổng trụ"
                                        value={selectedStation.total_chargers}
                                        valueStyle={{ fontSize: 18 }}
                                        titleStyle={{ whiteSpace: 'nowrap' }}
                                    />
                                </Col>
                            </Row>

                            {routeInfo && (
                                <div style={{
                                    marginTop: 16,
                                    padding: '12px 16px',
                                    background: '#e6f7ff',
                                    borderRadius: 14,
                                    border: '1px solid #91d5ff',
                                    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.05)'
                                }}>
                                    <Row justify="space-between" align="middle">
                                        <Text strong style={{ color: '#0050b3' }}>Tuyến đường ngắn nhất:</Text>
                                        <Tag color="blue" style={{ margin: 0, fontWeight: 'bold' }}>{routeInfo.distance} km</Tag>
                                    </Row>
                                    <div style={{ fontSize: 12, color: '#003a8c', marginTop: 6 }}>
                                        Thời gian di chuyển dự kiến: <strong>{routeInfo.duration} phút</strong>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="primary"
                                icon={<EnvironmentOutlined />}
                                block
                                size="large"
                                loading={routingLoading}
                                style={{ marginTop: 20, height: 48, borderRadius: 12, fontSize: 14, fontWeight: 'bold' }}
                                onClick={() => onDrawRoute(selectedStation)}
                            >
                                Chỉ đường trên bản đồ
                            </Button>
                        </Card>
                    </section>

                    <section>
                        <Title level={4}>Sơ đồ cổng sạc</Title>
                        <Row gutter={[12, 12]}>
                            {chargers.map((charger, index) => {
                                const config = getChargerStatusConfig(charger.status);
                                return (
                                    <Col span={8} key={charger.id}>
                                        <Card
                                            size="small"
                                            style={{
                                                textAlign: 'center',
                                                borderRadius: 16,
                                                background: config.bgColor,
                                                border: `1px solid ${config.borderColor}`,
                                                cursor: charger.status === 'AVAILABLE' ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            <ThunderboltOutlined style={{ color: config.iconColor, fontSize: 20 }} />
                                            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>Cổng {index + 1}</div>
                                            <Tag color={config.tagColor} style={{ fontSize: 9, margin: 0, border: 'none' }}>
                                                {config.label}
                                            </Tag>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    </section>

                    <div style={{ position: 'sticky', bottom: 0, background: '#fff', paddingTop: 20, paddingBottom: 20 }}>
                        <Button
                            type="primary"
                            size="large"
                            block
                            icon={<CalendarOutlined />}
                            onClick={onBooking}
                            style={{ height: 60, borderRadius: 30, fontSize: 18, fontWeight: 800, boxShadow: '0 8px 16px rgba(24, 144, 255, 0.4)' }}
                        >
                            ĐẶT LỊCH SẠC NGAY
                        </Button>
                    </div>
                </Space>
            )}
        </Drawer>
    );
};

export default StationDrawer;

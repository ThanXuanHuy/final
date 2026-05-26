import React from 'react';
import { Card, Row, Tag, Button, Typography, Space } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

const { Text } = Typography;

const RouteInfoWidget = ({
    routeInfo,
    selectedStation,
    navigationActive,
    onStartNavigation,
    onStopNavigation,
    onClearRoute,
}) => {
    if (!routeInfo) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: 440,
            pointerEvents: 'auto'
        }}>
            <Card
                style={{
                    borderRadius: 24,
                    border: 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)'
                }}
            >
                <Row justify="space-between" align="middle">
                    <Space direction="vertical" size={2}>
                        <Text strong style={{ fontSize: 16 }}>
                            {navigationActive ? '🔴 Đang dẫn đường...' : 'Đường đi đến'} {selectedStation?.name}
                        </Text>
                        <Space style={{ marginTop: 4 }}>
                            <Tag color="blue" style={{ fontSize: 13, fontWeight: 'bold' }}>{routeInfo.distance} km</Tag>
                            <Tag color="green" style={{ fontSize: 13, fontWeight: 'bold' }}>{routeInfo.duration} phút</Tag>
                        </Space>
                    </Space>
                    <Space>
                        {!navigationActive ? (
                            <Button
                                type="primary"
                                icon={<RocketOutlined />}
                                onClick={onStartNavigation}
                                style={{ borderRadius: 12, fontWeight: 'bold' }}
                            >
                                Bắt đầu
                            </Button>
                        ) : (
                            <Button
                                type="primary"
                                danger
                                onClick={onStopNavigation}
                                style={{ borderRadius: 12, fontWeight: 'bold' }}
                            >
                                Dừng
                            </Button>
                        )}
                        {!navigationActive && (
                            <Button
                                shape="circle"
                                onClick={onClearRoute}
                            >
                                X
                            </Button>
                        )}
                    </Space>
                </Row>
            </Card>
        </div>
    );
};

export default RouteInfoWidget;

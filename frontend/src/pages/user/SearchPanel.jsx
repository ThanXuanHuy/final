import React from 'react';
import { Card, Input, Select, Button, Typography, Tag, Space } from 'antd';
import { SearchOutlined, EnvironmentOutlined, ThunderboltOutlined, HeartFilled } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text } = Typography;
const { Search } = Input;

const SearchPanel = ({
    stations,
    selectedStation,
    loading,
    favorites,
    onFilterChange,
    onSearch,
    onFindNearMe,
    onStationClick,
}) => {
    return (
        <div style={{
            position: 'absolute',
            top: 24,
            left: 24,
            zIndex: 1000,
            width: 380,
            pointerEvents: 'none'
        }}>
            <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ pointerEvents: 'auto' }}>
                <Card
                    style={{
                        borderRadius: 24,
                        border: 'none',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(20px)'
                    }}
                >
                    <Title level={4} style={{ marginBottom: 20 }}>Tìm kiếm trạm sạc</Title>
                    <Search
                        placeholder="Tìm kiếm trạm sạc hoặc địa điểm..."
                        enterButton={<SearchOutlined />}
                        size="large"
                        allowClear
                        style={{ marginBottom: 16 }}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                        onSearch={onSearch}
                    />
                    <Space wrap style={{ marginBottom: 8 }}>
                        <Button
                            icon={<EnvironmentOutlined />}
                            onClick={onFindNearMe}
                            loading={loading}
                            shape="round"
                        >
                            Gần tôi nhất
                        </Button>
                        <Select
                            defaultValue="all"
                            style={{ width: 120 }}
                            onChange={(val) => onFilterChange('type', val)}
                        >
                            <Select.Option value="all">Loại trụ</Select.Option>
                            <Select.Option value="fast">Sạc nhanh</Select.Option>
                            <Select.Option value="normal">Sạc thường</Select.Option>
                        </Select>
                        <Select
                            defaultValue="any"
                            style={{ width: 115 }}
                            onChange={(val) => onFilterChange('price', val)}
                        >
                            <Select.Option value="any">Giá cả</Select.Option>
                            <Select.Option value="low">Dưới 4000đ</Select.Option>
                            <Select.Option value="high">Trên 4000đ</Select.Option>
                        </Select>
                    </Space>
                    <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Bộ lọc nâng cao giúp tối ưu lộ trình của bạn.</Text>
                    </div>
                </Card>

                {/* Quick Results List */}
                <div style={{ marginTop: 16, maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', paddingRight: 8 }}>
                    <AnimatePresence>
                        {stations.map((station) => (
                            <motion.div
                                key={station.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -2 }}
                                style={{ marginBottom: 12 }}
                            >
                                <Card
                                    hoverable
                                    onClick={() => onStationClick(station)}
                                    size="small"
                                    style={{
                                        borderRadius: 20,
                                        border: selectedStation?.id === station.id ? '2px solid #1890ff' : 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Text strong style={{ fontSize: 20 }}>
                                                    {station.name}
                                                </Text>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                                                <EnvironmentOutlined /> {station.address}
                                            </div>
                                            <div style={{ marginTop: 10 }}>
                                                {Number(station.total_chargers) === 0 ? (
                                                    <Tag color="default" style={{ borderRadius: 6 }}>
                                                        Chưa có trụ sạc
                                                    </Tag>
                                                ) : (
                                                    <Space>
                                                        {station.max_power && (
                                                            <Tag color="purple" style={{ borderRadius: 6, margin: 0 }}>
                                                                <ThunderboltOutlined /> Tối đa {station.max_power} kW
                                                            </Tag>
                                                        )}
                                                    </Space>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Text strong style={{ color: '#f5222d', fontSize: 16 }}>
                                                {station.price ? `Từ ${Number(station.price).toLocaleString()}đ` : 'Chưa có giá'}
                                            </Text>
                                            <div style={{ fontSize: 11, marginTop: 4 }}>
                                                {favorites.includes(station.id) && (
                                                    <div style={{ marginTop: 20 }}>
                                                        <HeartFilled style={{ color: '#ff4d4f', fontSize: 30 }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default SearchPanel;

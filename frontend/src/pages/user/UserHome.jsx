import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Input, Select, Button, Typography, Tag, Space, Drawer, Rate, Modal, Form, DatePicker, TimePicker, Divider, message, Statistic } from 'antd';
import {
    SearchOutlined,
    EnvironmentOutlined,
    ThunderboltOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    StarFilled,
    HeartOutlined,
    HeartFilled,
    RocketOutlined,
    BulbOutlined
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// Fix leaflet marker icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

import stationService from '../../api/stationService';
import bookingService from '../../api/bookingService';
import socket from '../../api/socket';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;

const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || 15, { duration: 1.5 });
        }
    }, [center, zoom, map]);
    return null;
};

const getChargerStatusConfig = (status) => {
    switch (status) {
        case 'AVAILABLE': return { label: 'TRỐNG', tagColor: 'success', bgColor: '#f6ffed', borderColor: '#b7eb8f', iconColor: '#52c41a' };
        case 'CHARGING': return { label: 'ĐANG SẠC', tagColor: 'processing', bgColor: '#e6f7ff', borderColor: '#91caff', iconColor: '#1677ff' };
        case 'MAINTENANCE': return { label: 'BẢO TRÌ', tagColor: 'warning', bgColor: '#fffbe6', borderColor: '#ffe58f', iconColor: '#faad14' };
        case 'OFFLINE': return { label: 'NGOẠI TUYẾN', tagColor: 'default', bgColor: '#fafafa', borderColor: '#d9d9d9', iconColor: '#8c8c8c' };
        default: return { label: 'KHÔNG RÕ', tagColor: 'default', bgColor: '#fafafa', borderColor: '#d9d9d9', iconColor: '#8c8c8c' };
    }
};

const UserHome = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedStation, setSelectedStation] = useState(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);
    const [bookingForm] = Form.useForm();
    const { favorites, toggleFavorite } = useAuthStore();

    const [stations, setStations] = useState([]);
    const [allStations, setAllStations] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [chargers, setChargers] = useState([]);
    const [filters, setFilters] = useState({ search: '', type: 'all', price: 'any' });
    const [loading, setLoading] = useState(false);
    const [mapCenter, setMapCenter] = useState([10.795, 106.721]);
    const [mapZoom, setMapZoom] = useState(13);

    const selectedPort = Form.useWatch('port', bookingForm);
    const timeRange = Form.useWatch('timeRange', bookingForm);
    const [estimatedCost, setEstimatedCost] = useState({ kwh: 0, cost: 0, pricePerKwh: 0 });

    useEffect(() => {
        if (selectedPort && timeRange && timeRange[0] && timeRange[1]) {
            const charger = chargers.find(c => c.id === selectedPort);
            if (charger) {
                const durationHours = timeRange[1].diff(timeRange[0], 'minute') / 60;
                if (durationHours > 0) {
                    const estKwh = durationHours * charger.power_output;
                    const totalCost = 20000 + (estKwh * charger.price_per_kwh);
                    setEstimatedCost({
                        kwh: Math.round(estKwh),
                        cost: Math.round(totalCost),
                        pricePerKwh: charger.price_per_kwh
                    });
                } else {
                    setEstimatedCost({ kwh: 0, cost: 0, pricePerKwh: charger.price_per_kwh });
                }
            }
        } else {
            setEstimatedCost({ kwh: 0, cost: 0, pricePerKwh: 0 });
        }
    }, [selectedPort, timeRange, chargers]);

    useEffect(() => {
        let result = [...allStations];

        if (filters.search) {
            result = result.filter(s =>
                s.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                s.address.toLowerCase().includes(filters.search.toLowerCase())
            );
        }

        if (filters.type === 'fast') {
            result = result.filter(s => s.total_chargers > 2);
        } else if (filters.type === 'normal') {
            result = result.filter(s => s.total_chargers > 0 && s.total_chargers <= 2);
        }

        if (filters.price === 'low') {
            result = result.filter(s => s.price && Number(s.price) < 4000);
        } else if (filters.price === 'high') {
            result = result.filter(s => s.price && Number(s.price) >= 4000);
        }

        setStations(result);
    }, [filters, allStations]);

    const fetchStations = async () => {
        try {
            const data = await stationService.getAll();
            setStations(data);
            setAllStations(data);
        } catch (error) {
            message.error('Không thể tải danh sách trạm sạc');
        }
    };

    const fetchRecommendations = async (lat, lng) => {
        try {
            const data = await stationService.getRecommendations(lat, lng);
            setRecommendations(data);
        } catch (error) {
            console.error('Failed to fetch recommendations');
        }
    };

    useEffect(() => {
        fetchStations();
        fetchRecommendations(); // Get default recommendations

        // Socket.io Real-time update
        socket.on('chargerStatusChanged', (data) => {
            console.log('Real-time update received:', data);
            fetchStations(); // Refresh station counts
            if (selectedStation && selectedStation.id === data.stationId) {
                // If the drawer is open for this station, refresh chargers
                stationService.getChargers(data.stationId).then(setChargers);
            }
        });

        return () => {
            socket.off('chargerStatusChanged');
        };
    }, [selectedStation]);

    const handleFindNearMe = () => {
        if (!navigator.geolocation) {
            return message.error('Trình duyệt không hỗ trợ định vị');
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const data = await stationService.getNear(latitude, longitude);
                setStations(data);
                setAllStations(data);
                setMapCenter([latitude, longitude]);
                setMapZoom(15);
                message.success(`Tìm thấy ${data.length} trạm xung quanh bạn`);
            } catch (error) {
                console.error(error);
                message.error('Lỗi khi tìm trạm gần nhất');
            } finally {
                setLoading(false);
            }
        }, (err) => {
            console.error(err);
            message.error('Không thể lấy vị trí của bạn. Vui lòng cấp quyền truy cập GPS.');
            setLoading(false);
        });
    };


    React.useEffect(() => {
        if (location.state?.openStationId && stations.length > 0) {
            const station = stations.find(s => s.id === location.state.openStationId);
            if (station) {
                handleMarkerClick(station);
                setMapCenter([Number(station.latitude), Number(station.longitude)]);
                setMapZoom(16);
            }
        }
    }, [location.state, stations]);

    const handleMarkerClick = async (station) => {
        setSelectedStation(station);
        setDrawerVisible(true);
        try {
            const chargerData = await stationService.getChargers(station.id);
            setChargers(chargerData);
        } catch (error) {
            message.error('Không thể tải thông tin trụ sạc');
        }
    };

    const handleBooking = () => {
        setBookingModalVisible(true);
        setBookingStep(1);
    };

    const confirmBooking = () => {
        bookingForm.validateFields().then(async (values) => {
            const startTime = values.timeRange[0].format('HH:mm');
            const endTime = values.timeRange[1].format('HH:mm');

            try {
                await bookingService.create({
                    charger_id: values.port,
                    booking_date: values.date.format('YYYY-MM-DD'),
                    start_time: startTime,
                    end_time: endTime,
                    estimated_kwh: estimatedCost.kwh,
                    cost: estimatedCost.cost
                });
                setBookingStep(2);
            } catch (error) {
                console.error(error);
                message.error(error.response?.data?.error || 'Không thể đặt lịch sạc. Vui lòng thử lại!');
            }
        });
    };

    return (
        <div style={{ height: 'calc(100vh - 80px)', position: 'relative', overflow: 'hidden', margin: '-24px -50px' }}>
            {/* Floating Search Panel */}
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
                            placeholder="Tìm kiếm trên Google Maps"
                            enterButton={<SearchOutlined />}
                            size="large"
                            style={{ marginBottom: 16 }}
                            onSearch={async (value) => {
                                setFilters(prev => ({ ...prev, search: value }));
                                if (!value) return;

                                // 1. Try to geocode the search query using OpenStreetMap Nominatim
                                try {
                                    setLoading(true);
                                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1`);
                                    const data = await response.json();

                                    if (data && data.length > 0) {
                                        const { lat, lon } = data[0];
                                        setMapCenter([parseFloat(lat), parseFloat(lon)]);
                                        setMapZoom(15);

                                        // Also fetch recommendations for this new center
                                        fetchRecommendations(lat, lon);
                                    }
                                } catch (error) {
                                    console.error('Geocoding error:', error);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                        <Space wrap style={{ marginBottom: 8 }}>
                            <Button
                                icon={<EnvironmentOutlined />}
                                onClick={handleFindNearMe}
                                loading={loading}
                                shape="round"
                            >
                                Gần tôi nhất
                            </Button>
                            <Select
                                defaultValue="all"
                                style={{ width: 120 }}
                                onChange={(val) => setFilters(prev => ({ ...prev, type: val }))}
                            >
                                <Select.Option value="all">Loại trụ</Select.Option>
                                <Select.Option value="fast">Sạc nhanh</Select.Option>
                                <Select.Option value="normal">Sạc thường</Select.Option>
                            </Select>
                            <Select
                                defaultValue="any"
                                style={{ width: 115 }}
                                onChange={(val) => setFilters(prev => ({ ...prev, price: val }))}
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
                        {recommendations.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                                <Text strong style={{ display: 'block', marginBottom: 12, color: '#1890ff' }}>
                                    <RocketOutlined /> Top 3 gợi ý thông minh
                                </Text>
                                {recommendations.map(station => (
                                    <motion.div key={`rec-${station.id}`} whileHover={{ y: -2 }} style={{ marginBottom: 12 }}>
                                        <Card
                                            hoverable
                                            size="small"
                                            onClick={() => handleMarkerClick(station)}
                                            style={{
                                                borderRadius: 16,
                                                border: '1px solid #91d5ff',
                                                background: 'linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Text strong>{station.name}</Text>
                                                <Tag color="cyan">AI Smart Choice</Tag>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                                <BulbOutlined style={{ color: '#1890ff' }} /> Dự báo: Trống trong 20 phút tới
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                                <Divider style={{ margin: '16px 0' }} />
                                <Text strong style={{ display: 'block', marginBottom: 12 }}>Tất cả trạm sạc</Text>
                            </div>
                        )}
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
                                        onClick={() => handleMarkerClick(station)}
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
                                                            <Tag color={Number(station.available_chargers) > 0 ? 'green' : 'red'} style={{ borderRadius: 6, margin: 0 }}>
                                                                {station.available_chargers} / {station.total_chargers} TRỐNG
                                                            </Tag>
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
                                                    <Rate disabled defaultValue={1} count={1} style={{ fontSize: 10 }} />
                                                    <Text strong> {station.rating || '4.5'}</Text>
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

            {/* Map Component */}
            <div style={{ height: '100%', width: '100%' }}>
                <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                    <MapController center={mapCenter} zoom={mapZoom} />
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MarkerClusterGroup chunkedLoading>
                        {stations.filter(s => s.latitude && s.longitude).map((station) => (
                            <Marker
                                key={station.id}
                                position={[Number(station.latitude), Number(station.longitude)]}
                                eventHandlers={{ click: () => handleMarkerClick(station) }}
                            >
                                <Popup>
                                    <div style={{ padding: 4 }}>
                                        <Text strong>{station.name}</Text><br />
                                        <Space style={{ marginTop: 4 }}>
                                            <Tag color="green" style={{ margin: 0 }}>{station.available_chargers} chỗ trống</Tag>
                                            {station.max_power && <Tag color="purple" style={{ margin: 0 }}>{station.max_power} kW</Tag>}
                                        </Space>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>
                </MapContainer>
            </div >

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
                                icon={favorites.includes(selectedStation.id) ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(selectedStation.id);
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
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
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
                                    <Col span={10}>
                                        <Statistic
                                            title="Giá sạc (từ)"
                                            value={selectedStation.price ? Number(selectedStation.price) : 'Chưa cập nhật'}
                                            suffix={selectedStation.price ? "đ" : ""}
                                            valueStyle={{ color: '#f5222d', fontSize: 18, whiteSpace: 'nowrap' }}
                                            titleStyle={{ whiteSpace: 'nowrap' }}
                                        />
                                    </Col>
                                    <Col span={7}>
                                        <Statistic
                                            title="Tổng trụ"
                                            value={selectedStation.total_chargers}
                                            valueStyle={{ fontSize: 18 }}
                                            titleStyle={{ whiteSpace: 'nowrap' }}
                                        />
                                    </Col>
                                    <Col span={7}>
                                        <Statistic
                                            title="Đánh giá"
                                            value={selectedStation.rating || '4.5'}
                                            prefix={<StarFilled style={{ color: '#faad14' }} />}
                                            valueStyle={{ fontSize: 18 }}
                                        />
                                    </Col>
                                </Row>
                                <Button
                                    type="primary"
                                    icon={<EnvironmentOutlined />}
                                    block
                                    size="large"
                                    style={{ marginTop: 20, height: 50, borderRadius: 12 }}
                                    onClick={() => {
                                        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.latitude},${selectedStation.longitude}`;
                                        window.open(url, '_blank');
                                    }}
                                >
                                    Chỉ đường đến trạm
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
                                onClick={handleBooking}
                                style={{ height: 60, borderRadius: 30, fontSize: 18, fontWeight: 800, boxShadow: '0 8px 16px rgba(24, 144, 255, 0.4)' }}
                            >
                                ĐẶT LỊCH SẠC NGAY
                            </Button>
                        </div>
                    </Space>
                )}
            </Drawer>

            <Modal
                title="ĐẶT LỊCH SẠC"
                open={bookingModalVisible}
                onCancel={() => setBookingModalVisible(false)}
                footer={null}
                width={500}
                centered
                style={{ borderRadius: 24 }}
            >
                {bookingStep === 1 ? (
                    <Form form={bookingForm} layout="vertical">
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Title level={4} style={{ margin: 0 }}>{selectedStation?.name}</Title>
                            <Text type="secondary">{selectedStation?.address}</Text>
                        </div>
                        <Form.Item label="Ngày sạc" name="date" rules={[{ required: true, message: 'Vui lòng chọn ngày sạc' }]}>
                            <DatePicker style={{ width: '100%' }} size="large" disabledDate={current => current && current < dayjs().startOf('day')} />
                        </Form.Item>
                        <Form.Item label="Thời gian sạc" name="timeRange" rules={[{ required: true, message: 'Vui lòng chọn thời gian sạc' }]}>
                            <TimePicker.RangePicker style={{ width: '100%' }} size="large" format="HH:mm" />
                        </Form.Item>
                        <Form.Item label="Cổng sạc" name="port" rules={[{ required: true, message: 'Vui lòng chọn cổng sạc' }]}>
                            <Select size="large" placeholder="Chọn cổng sạc còn trống">
                                {chargers.map((charger, index) => {
                                    const config = getChargerStatusConfig(charger.status);
                                    return (
                                        <Select.Option
                                            key={charger.id}
                                            value={charger.id}
                                            disabled={charger.status !== 'AVAILABLE'}
                                        >
                                            Cổng {index + 1}
                                        </Select.Option>
                                    );
                                })}
                            </Select>
                        </Form.Item>
                        <Divider />
                        <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 16, marginBottom: 24 }}>
                            <Row justify="space-between">
                                <Text>Phí đặt chỗ:</Text>
                                <Text strong>20,000đ</Text>
                            </Row>
                            <Row justify="space-between" style={{ marginTop: 8 }}>
                                <Text>Đơn giá sạc:</Text>
                                <Text strong>{estimatedCost.pricePerKwh ? `${estimatedCost.pricePerKwh}đ/kWh` : 'Chưa xác định'}</Text>
                            </Row>
                            <Row justify="space-between" style={{ marginTop: 8 }}>
                                <Text>Sản lượng tiêu thụ dự kiến:</Text>
                                <Text strong>{estimatedCost.kwh} kWh</Text>
                            </Row>
                            <Divider style={{ margin: '12px 0' }} />
                            <Row justify="space-between">
                                <Text strong style={{ fontSize: 16 }}>Tổng chi phí ước tính:</Text>
                                <Text strong style={{ fontSize: 18, color: '#f5222d' }}>{estimatedCost.cost.toLocaleString()}đ</Text>
                            </Row>
                        </div>
                        <Button type="primary" block size="large" onClick={confirmBooking} style={{ height: 54, borderRadius: 16, fontWeight: 700 }}>
                            Xác nhận đặt chỗ
                        </Button>
                    </Form>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <CheckCircleOutlined style={{ fontSize: 80, color: '#52c41a', marginBottom: 24 }} />
                        </motion.div>
                        <Title level={3}>Đặt lịch thành công!</Title>
                        <Text type="secondary">Cảm ơn bạn đã sử dụng dịch vụ. Thông tin chi tiết đã được gửi vào email của bạn.</Text>
                        <div style={{ marginTop: 32 }}>
                            <Button type="primary" size="large" block onClick={() => setBookingModalVisible(false)} style={{ borderRadius: 12 }}>
                                Xác nhận
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div >
    );
};

export default UserHome;

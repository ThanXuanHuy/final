import React, { useState, useEffect, useRef } from 'react';
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
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
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

const MapController = ({ center, zoom, bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 1.5 });
        } else if (center) {
            map.flyTo(center, zoom || 15, { duration: 1.5 });
        }
    }, [center, zoom, bounds, map]);
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
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [bookingForm] = Form.useForm();
    const { user, favorites, toggleFavorite } = useAuthStore();

    // --- New Booking UI States ---
    const [selectedChargerPort, setSelectedChargerPort] = useState(null);
    const [mockBookedSlots, setMockBookedSlots] = useState([]);
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    // -----------------------------

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

    // Routing & GPS Location states
    const [userLocation, setUserLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [routeBounds, setRouteBounds] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);
    const [routingLoading, setRoutingLoading] = useState(false);

    // Navigation tracking states
    const [navigationActive, setNavigationActive] = useState(false);
    const [navModalVisible, setNavModalVisible] = useState(false);
    const watchIdRef = useRef(null);
    const simIntervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            if (simIntervalRef.current) clearInterval(simIntervalRef.current);
        };
    }, []);

    // Custom pulsing user location marker icon
    const userLocationIcon = L.divIcon({
        html: `<div style="
            width: 18px;
            height: 18px;
            background-color: #1890ff;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(24, 144, 255, 0.8);
            position: relative;
        ">
            <div style="
                position: absolute;
                top: -3px;
                left: -3px;
                width: 18px;
                height: 18px;
                background-color: rgba(24, 144, 255, 0.4);
                border-radius: 50%;
                animation: pulse 1.8s infinite ease-in-out;
            "></div>
        </div>
        <style>
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(2.5); opacity: 0; }
            }
        </style>`,
        className: 'user-location-marker',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });

    useEffect(() => {
        if (selectedChargerPort && selectedTimeSlots && selectedTimeSlots.length > 0) {
            const charger = chargers.find(c => c.id === selectedChargerPort);
            if (charger) {
                const durationHours = selectedTimeSlots.length > 1 ? selectedTimeSlots.length - 1 : 0;
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
    }, [selectedChargerPort, selectedTimeSlots, chargers]);

    useEffect(() => {
        const fetchBookedSlots = async () => {
            if (selectedChargerPort && selectedDate) {
                try {
                    const dateStr = selectedDate.format('YYYY-MM-DD');
                    const res = await bookingService.getChargerSlots(selectedChargerPort, dateStr);

                    const bookedHours = [];
                    // axiosClient returns response.data directly, so res is the array
                    const bookingsArray = Array.isArray(res) ? res : (res.data || []);
                    bookingsArray.forEach(booking => {
                        const startHour = parseInt(booking.start_time.split(':')[0], 10);
                        const endHour = parseInt(booking.end_time.split(':')[0], 10);
                        for (let i = startHour; i < endHour; i++) {
                            bookedHours.push(i);
                        }
                    });
                    setMockBookedSlots([...new Set(bookedHours)]);
                } catch (error) {
                    console.error('Lỗi khi tải thông tin lịch đặt:', error);
                }
            } else {
                setMockBookedSlots([]);
            }
        };
        fetchBookedSlots();
    }, [selectedChargerPort, selectedDate, refreshTrigger]);

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

    // Auto get current location on mount
    const getMyCurrentLocation = () => {
        if (!navigator.geolocation) return;
        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation([latitude, longitude]);
                setMapCenter([latitude, longitude]);
                setMapZoom(14);
                fetchRecommendations(latitude, longitude);
            },
            (error) => {
                console.error('Lỗi lấy GPS ban đầu:', error);
            },
            options
        );
    };

    useEffect(() => {
        fetchStations();
        fetchRecommendations(); // Get default recommendations
        getMyCurrentLocation(); // Auto get user location on mount

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

    const handleCloseDrawer = () => {
        setDrawerVisible(false);
    };

    const handleDrawRoute = async (station) => {
        if (!userLocation) {
            if (!navigator.geolocation) {
                return message.error('Trình duyệt không hỗ trợ định vị');
            }
            message.info('Đang xác định vị trí hiện tại của bạn...');
            const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const userLoc = [latitude, longitude];
                    setUserLocation(userLoc);
                    setMapCenter(userLoc);
                    await calculateRoute(userLoc, [Number(station.latitude), Number(station.longitude)]);
                },
                (err) => {
                    console.error("Lỗi GPS khi vẽ đường: ", err);
                    message.error('Không thể lấy vị trí hiện tại. Vui lòng bật GPS.');
                },
                options
            );
        } else {
            await calculateRoute(userLocation, [Number(station.latitude), Number(station.longitude)]);
        }
    };

    const calculateRoute = async (start, end) => {
        setRoutingLoading(true);
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                setRouteCoordinates(coords);
                setRouteBounds(coords); // Save route coordinates to bounds
                setRouteInfo({
                    distance: (route.distance / 1000).toFixed(2),
                    duration: Math.round(route.duration / 60)
                });

                setDrawerVisible(false); // Automatically close drawer to show map and route
                message.success(`Đã hiển thị đường đi ngắn nhất: ${(route.distance / 1000).toFixed(2)} km (${Math.round(route.duration / 60)} phút)`);
            } else {
                message.error('Không tìm thấy tuyến đường phù hợp');
            }
        } catch (error) {
            console.error('Routing error:', error);
            message.error('Không thể tính toán chỉ đường. Thử lại sau!');
        } finally {
            setRoutingLoading(false);
        }
    };

    // Helper to calculate distance in meters
    const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Off-route detour check and auto recalculate
    const checkOffRouteAndRecalculate = (currentPos, polyline, destination) => {
        if (polyline.length === 0) return;
        let minDistance = Infinity;
        for (const pt of polyline) {
            const d = getDistanceInMeters(currentPos[0], currentPos[1], pt[0], pt[1]);
            if (d < minDistance) minDistance = d;
        }

        // If user is more than 50 meters away from route, recalculate
        if (minDistance > 50) {
            message.warning("Bạn đã đi chệch hướng! Đang tự động tính toán lại đường đi mới...");
            calculateRoute(currentPos, destination);
        }
    };

    const startNavigation = () => {
        setNavigationActive(true);
        if (!navigator.geolocation) {
            return message.error('Trình duyệt không hỗ trợ định vị');
        }

        message.success("Bắt đầu dẫn đường GPS thực tế");

        // Immediately get current position to zoom map before tracking
        navigator.geolocation.getCurrentPosition(
            (initPosition) => {
                if (!navigationActive) return; // Prevent zooming if user already stopped
                const { latitude, longitude } = initPosition.coords;
                setUserLocation([latitude, longitude]);
                setMapCenter([latitude, longitude]);
                setMapZoom(17); // Zoom street-level for navigation
            },
            () => { },
            { enableHighAccuracy: true, timeout: 5000 }
        );

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                if (!navigationActive) return; // Prevent state updates if stopped
                const { latitude, longitude } = position.coords;
                const newPos = [latitude, longitude];
                setUserLocation(newPos);
                setMapCenter(newPos);

                const distToDest = getDistanceInMeters(latitude, longitude, Number(selectedStation.latitude), Number(selectedStation.longitude));
                setRouteInfo(prev => prev ? ({
                    ...prev,
                    distance: (distToDest / 1000).toFixed(2),
                    duration: Math.ceil(distToDest / 500)
                }) : null);

                if (distToDest < 20) {
                    message.success("Bạn đã đến trạm sạc: " + selectedStation.name + "!");
                    stopNavigation();
                    return;
                }

                // Check off-route and auto recalculate
                checkOffRouteAndRecalculate(newPos, routeCoordinates, [Number(selectedStation.latitude), Number(selectedStation.longitude)]);
            },
            (err) => {
                console.error("GPS tracking error:", err);
                message.error("Lỗi định vị GPS! Vui lòng cấp quyền truy cập vị trí.");
                setNavigationActive(false);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    };

    const stopNavigation = () => {
        setNavigationActive(false);
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (simIntervalRef.current) {
            clearInterval(simIntervalRef.current);
            simIntervalRef.current = null;
        }
        setRouteCoordinates([]);
        setRouteBounds([]);
        setRouteInfo(null);
        message.info("Đã dừng dẫn đường");
    };

    const handleFindNearMe = () => {
        if (!navigator.geolocation) {
            return message.error('Trình duyệt không hỗ trợ định vị');
        }

        setLoading(true);
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                setUserLocation([latitude, longitude]); // Update user coordinates
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
            console.error("Lỗi Geolocation: ", err);
            message.error('Không thể lấy vị trí hiện tại. Vui lòng bật GPS.');
            setLoading(false);
        }, options);
    };


    React.useEffect(() => {
        if (location.state?.openStationId && stations.length > 0) {
            const station = stations.find(s => s.id === location.state.openStationId);
            if (station) {
                handleMarkerClick(station);
                setMapCenter([Number(station.latitude), Number(station.longitude)]);
                setMapZoom(16);

                // Clear the state so it doesn't reopen if stations update
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, stations, navigate, location.pathname]);

    const handleMarkerClick = async (station) => {
        setSelectedStation(station);
        setDrawerVisible(true);
        // Clear active route when opening details of a new station
        setRouteCoordinates([]);
        setRouteBounds([]);
        setRouteInfo(null);
        try {
            const chargerData = await stationService.getChargers(station.id);
            setChargers(chargerData);
        } catch (error) {
            message.error('Không thể tải thông tin trụ sạc');
        }
    };

    const handleBooking = () => {
        if (!user) {
            message.error('Vui lòng đăng nhập để đặt lịch sạc');
            return;
        }
        setBookingModalVisible(true);
        setBookingStep(1);
        setSelectedChargerPort(null);
        setSelectedTimeSlots([]);
        setMockBookedSlots([]);
        bookingForm.resetFields();
    };

    const toggleTimeSlot = (hour) => {
        const isToday = selectedDate.isSame(dayjs(), 'day');
        if (isToday && hour <= dayjs().hour()) return;
        if (mockBookedSlots.includes(hour)) return;

        setSelectedTimeSlots(prev => {
            let current = prev.filter(h => h !== 24);
            let nextSelection = [];

            if (current.length === 0) {
                nextSelection = [hour];
            } else {
                const min = Math.min(...current);
                const max = Math.max(...current);

                if (current.length === 1 && current[0] === hour) {
                    nextSelection = [];
                } else if (current.includes(hour)) {
                    if (hour === max) nextSelection = current.filter(h => h !== max);
                    else if (hour === min) nextSelection = current.filter(h => h !== min);
                    else {
                        for (let i = min; i <= hour; i++) nextSelection.push(i);
                    }
                } else if (hour === max + 1) {
                    nextSelection = [...current, hour].sort((a, b) => a - b);
                } else if (hour === min - 1) {
                    nextSelection = [hour, ...current].sort((a, b) => a - b);
                } else if (current.length === 1) {
                    const start = Math.min(current[0], hour);
                    const end = Math.max(current[0], hour);

                    for (let i = start; i <= end; i++) {
                        if (mockBookedSlots.includes(i)) {
                            message.error('Có khoảng thời gian đã được đặt ở giữa. Vui lòng chọn lại.');
                            return [hour];
                        }
                    }

                    for (let i = start; i <= end; i++) {
                        nextSelection.push(i);
                    }
                } else {
                    nextSelection = [hour];
                }
            }

            // Mặc định 23h cho đến 0h của ngày hôm sau luôn
            if (nextSelection.length > 0 && Math.max(...nextSelection) === 23) {
                nextSelection.push(24);
            }

            return nextSelection;
        });
    };

    const handlePayment = async () => {
        if (selectedTimeSlots.length < 2) return;

        setIsProcessingPayment(true);
        message.loading({ content: 'Đang xử lý thanh toán...', key: 'payment' });

        const startTimeStr = `${Math.min(...selectedTimeSlots).toString().padStart(2, '0')}:00`;
        const endTimeStr = `${Math.max(...selectedTimeSlots).toString().padStart(2, '0')}:00`;

        try {
            await bookingService.create({
                charger_id: selectedChargerPort,
                booking_date: selectedDate.format('YYYY-MM-DD'),
                start_time: startTimeStr,
                end_time: endTimeStr,
                estimated_kwh: estimatedCost.kwh,
                cost: estimatedCost.cost
            });

            message.success({ content: 'Thanh toán thành công! Lịch sạc đã được đặt.', key: 'payment', duration: 3 });

            // Cập nhật ngay trên UI bằng cách gọi lại API fetchBookedSlots thông qua refreshTrigger
            setRefreshTrigger(prev => prev + 1);
            
            setSelectedTimeSlots([]);
            setBookingStep(2);
        } catch (error) {
            console.error(error);
            message.error({ content: error.response?.data?.error || 'Không thể đặt lịch sạc. Vui lòng thử lại!', key: 'payment', duration: 3 });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 80px)', position: 'relative', overflow: 'hidden', margin: '-10px' }}>
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
                            placeholder="Tìm kiếm trạm sạc hoặc địa điểm..."
                            enterButton={<SearchOutlined />}
                            size="large"
                            allowClear
                            style={{ marginBottom: 16 }}
                            onChange={(e) => {
                                setFilters(prev => ({ ...prev, search: e.target.value }));
                            }}
                            onSearch={async (value) => {
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
                                                    {/* Rating removed */}
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
                    <MapController center={mapCenter} zoom={mapZoom} bounds={routeBounds} />
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {userLocation && (
                        <Marker position={userLocation} icon={userLocationIcon}>
                            <Popup>
                                <div style={{ fontWeight: 'bold', color: '#1890ff' }}>Vị trí của bạn</div>
                            </Popup>
                        </Marker>
                    )}
                    {routeCoordinates.length > 0 && (
                        <Polyline
                            positions={routeCoordinates}
                            color="#1890ff"
                            weight={6}
                            opacity={0.8}
                        />
                    )}
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
                                            {station.max_power && <Tag color="purple" style={{ margin: 0 }}>{station.max_power} kW</Tag>}
                                        </Space>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>
                </MapContainer>
            </div >

            {/* Floating Route Info Widget */}
            {routeInfo && (
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
                                        onClick={startNavigation}
                                        style={{ borderRadius: 12, fontWeight: 'bold' }}
                                    >
                                        Bắt đầu
                                    </Button>
                                ) : (
                                    <Button
                                        type="primary"
                                        danger
                                        onClick={stopNavigation}
                                        style={{ borderRadius: 12, fontWeight: 'bold' }}
                                    >
                                        Dừng
                                    </Button>
                                )}
                                {!navigationActive && (
                                    <Button
                                        shape="circle"
                                        onClick={() => {
                                            setRouteCoordinates([]);
                                            setRouteBounds([]);
                                            setRouteInfo(null);
                                        }}
                                    >
                                        X
                                    </Button>
                                )}
                            </Space>
                        </Row>
                    </Card>
                </div>
            )}


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
                                    if (!user) {
                                        message.error('Vui lòng đăng nhập để thêm vào danh sách yêu thích');
                                        return;
                                    }
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
                onClose={handleCloseDrawer}
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
                                    onClick={() => handleDrawRoute(selectedStation)}
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
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Title level={4} style={{ margin: 0 }}>{selectedStation?.name}</Title>
                            <Text type="secondary">{selectedStation?.address}</Text>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <Text strong>1. Chọn ngày sạc:</Text>
                            <DatePicker
                                style={{ width: '100%', marginTop: 8 }}
                                size="large"
                                format="DD-MM-YYYY"
                                disabledDate={current => current && current < dayjs().startOf('day')}
                                value={selectedDate}
                                onChange={(date) => {
                                    setSelectedDate(date || dayjs());
                                    setSelectedTimeSlots([]);
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <Text strong>2. Chọn cổng sạc:</Text>
                            <Select
                                size="large"
                                style={{ width: '100%', marginTop: 8 }}
                                placeholder="-- Vui lòng chọn cổng sạc --"
                                value={selectedChargerPort}
                                onChange={(val) => {
                                    setSelectedChargerPort(val);
                                    setSelectedTimeSlots([]);
                                    setMockBookedSlots([]);
                                }}
                            >
                                {chargers.map((charger, index) => (
                                    <Select.Option
                                        key={charger.id}
                                        value={charger.id}
                                        disabled={charger.status === 'MAINTENANCE' || charger.status === 'OFFLINE'}
                                    >
                                        Cổng {index + 1} {charger.status === 'MAINTENANCE' || charger.status === 'OFFLINE' ? '(Bảo trì/Ngoại tuyến)' : ''}
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>

                        {selectedChargerPort && (
                            <div style={{ marginBottom: 24 }}>
                                <Text strong>3. Chọn giờ sạc (24h):</Text>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(6, 1fr)',
                                    gap: 8,
                                    marginTop: 12
                                }}>
                                    {Array.from({ length: 24 }, (_, i) => i).map(hour => {
                                        const isToday = selectedDate.isSame(dayjs(), 'day');
                                        const isPast = isToday && hour <= dayjs().hour();
                                        const isBooked = mockBookedSlots.includes(hour);
                                        const isSelected = selectedTimeSlots.includes(hour);

                                        let bgColor = '#ffffff';
                                        let textColor = '#333';
                                        let borderColor = '#d9d9d9';
                                        let cursor = 'pointer';

                                        if (isPast) {
                                            bgColor = '#f0f0f0';
                                            textColor = '#bfbfbf';
                                            borderColor = '#e8e8e8';
                                            cursor = 'not-allowed';
                                        } else if (isBooked) {
                                            bgColor = '#ff4d4f'; // Đỏ (Booked)
                                            textColor = '#fff';
                                            borderColor = '#ff4d4f';
                                            cursor = 'not-allowed';
                                        } else if (isSelected) {
                                            bgColor = '#52c41a'; // Xanh lá (Selected)
                                            textColor = '#fff';
                                            borderColor = '#52c41a';
                                        } else {
                                            bgColor = '#f5f5f5'; // Xám nhạt (Available)
                                        }

                                        return (
                                            <div
                                                key={hour}
                                                onClick={() => toggleTimeSlot(hour)}
                                                style={{
                                                    background: bgColor,
                                                    color: textColor,
                                                    border: `1px solid ${borderColor}`,
                                                    borderRadius: 8,
                                                    padding: '10px 0',
                                                    textAlign: 'center',
                                                    cursor: cursor,
                                                    fontWeight: isSelected ? 'bold' : 'normal',
                                                    transition: 'all 0.2s',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                {hour.toString().padStart(2, '0')}:00
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: 12, height: 12, background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 2 }}></div> Trống
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 2 }}></div> Đang chọn
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: 12, height: 12, background: '#ff4d4f', borderRadius: 2 }}></div> Đã đặt
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 16, marginBottom: 24 }}>
                            <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Chi tiết thanh toán</Title>
                            <Row justify="space-between">
                                <Text>Cổng sạc đang chọn:</Text>
                                <Text strong>{selectedChargerPort ? `Cổng số ${chargers.findIndex(c => c.id === selectedChargerPort) + 1}` : '--'}</Text>
                            </Row>
                            <Row justify="space-between" style={{ marginTop: 8 }}>
                                <Text>Thời gian đặt:</Text>
                                <Text strong>
                                    {selectedTimeSlots.length > 1
                                        ? `${Math.min(...selectedTimeSlots).toString().padStart(2, '0')}:00 đến ${Math.max(...selectedTimeSlots) === 24 ? '00' : Math.max(...selectedTimeSlots).toString().padStart(2, '0')}:00`
                                        : (selectedTimeSlots.length === 1 ? 'Vui lòng chọn thêm giờ kết thúc' : '--:-- đến --:--')}
                                </Text>
                            </Row>
                            <Divider style={{ margin: '12px 0' }} />
                            <Row justify="space-between">
                                <Text>Phí đặt chỗ:</Text>
                                <Text strong>20,000 đ</Text>
                            </Row>
                            <Row justify="space-between" style={{ marginTop: 8 }}>
                                <Text>Đơn giá sạc:</Text>
                                <Text strong>{estimatedCost.pricePerKwh ? `${Number(estimatedCost.pricePerKwh).toLocaleString()} đ/kWh` : 'Chưa xác định'}</Text>
                            </Row>
                            <Row justify="space-between" style={{ marginTop: 8 }}>
                                <Text>Sản lượng tiêu thụ dự kiến ({selectedTimeSlots.length > 1 ? selectedTimeSlots.length - 1 : 0} giờ):</Text>
                                <Text strong>{estimatedCost.kwh} kWh</Text>
                            </Row>
                            <Divider style={{ margin: '12px 0' }} />
                            <Row justify="space-between">
                                <Text strong style={{ fontSize: 16 }}>Tổng chi phí ước tính:</Text>
                                <Text strong style={{ fontSize: 18, color: '#f5222d' }}>
                                    {estimatedCost.cost.toLocaleString()} đ
                                </Text>
                            </Row>
                        </div>

                        <Button
                            type="primary"
                            block
                            size="large"
                            loading={isProcessingPayment}
                            disabled={selectedTimeSlots.length < 2}
                            onClick={handlePayment}
                            style={{ height: 54, borderRadius: 16, fontWeight: 700 }}
                        >
                            Thanh toán ngay
                        </Button>
                    </div>
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

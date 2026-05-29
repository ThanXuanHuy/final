import React, { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// Fix leaflet default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

import stationService from '../../api/stationService';
import bookingService from '../../api/bookingService';
import socket from '../../api/socket';
import dayjs from 'dayjs';
import SearchPanel from './SearchPanel';
import MapView from './MapView';
import RouteInfoWidget from './RouteInfoWidget';
import StationDrawer from './StationDrawer';
import BookingModal from './BookingModal';

const userLocationIcon = L.divIcon({
    html: `
        <div style="
            width:18px;height:18px;
            background:#1890ff;
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 0 10px rgba(24,144,255,0.8);
            position:relative;">
            <div style="
                position:absolute;top:-3px;left:-3px;
                width:18px;height:18px;
                background:rgba(24,144,255,0.4);
                border-radius:50%;
                animation:pulse 1.8s infinite ease-in-out;">
            </div>
        </div>
        <style>
            @keyframes pulse{
                0%{transform:scale(1);opacity:1;}
                100%{transform:scale(2.5);opacity:0;}
            }
        </style>`,
    className: 'user-location-marker',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

const UserHome = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, favorites, toggleFavorite } = useAuthStore();

    // Station / UI 
    const [selectedStation, setSelectedStation] = useState(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [stations, setStations] = useState([]);
    const [allStations, setAllStations] = useState([]);
    const [chargers, setChargers] = useState([]);
    const [filters, setFilters] = useState({ search: '', type: 'all', price: 'any' });
    const [loading, setLoading] = useState(false);
    const [mapCenter, setMapCenter] = useState([10.795, 106.721]);
    const [mapZoom, setMapZoom] = useState(13);

    // Booking 
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedChargerPort, setSelectedChargerPort] = useState(null);
    const [mockBookedSlots, setMockBookedSlots] = useState([]);
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [estimatedCost, setEstimatedCost] = useState({ kwh: 0, cost: 0, pricePerKwh: 0 });

    // ─── Routing / GPS ─────────────────────────────────────────────────────────
    const [userLocation, setUserLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [routeBounds, setRouteBounds] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);
    const [routingLoading, setRoutingLoading] = useState(false);
    const [navigationActive, setNavigationActive] = useState(false);
    const watchIdRef = useRef(null);
    const simIntervalRef = useRef(null);

    // ─── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            if (simIntervalRef.current) clearInterval(simIntervalRef.current);
        };
    }, []);

    // ─── Estimated cost ────────────────────────────────────────────────────────
    useEffect(() => {
        if (selectedChargerPort && selectedTimeSlots.length > 0) {
            const charger = chargers.find(c => c.id === selectedChargerPort);
            if (charger) {
                const durationHours = selectedTimeSlots.length;
                if (durationHours > 0) {
                    const estKwh = durationHours * charger.power_output;
                    const totalCost = 20000 + estKwh * charger.price_per_kwh;
                    setEstimatedCost({ kwh: Math.round(estKwh), cost: Math.round(totalCost), pricePerKwh: charger.price_per_kwh });
                } else {
                    setEstimatedCost({ kwh: 0, cost: 0, pricePerKwh: charger.price_per_kwh });
                }
                return;
            }
        }
        setEstimatedCost({ kwh: 0, cost: 0, pricePerKwh: 0 });
    }, [selectedChargerPort, selectedTimeSlots, chargers]);

    // ─── Fetch booked slots ────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            if (!selectedChargerPort || !selectedDate) { setMockBookedSlots([]); return; }
            try {
                const res = await bookingService.getChargerSlots(selectedChargerPort, selectedDate.format('YYYY-MM-DD'));
                const arr = Array.isArray(res) ? res : (res.data || []);
                const hours = [];
                const selDateStr = selectedDate.format('YYYY-MM-DD');
                arr.forEach(b => {
                    const s = parseInt(b.start_time.split(':')[0], 10);
                    const e = parseInt(b.end_time.split(':')[0], 10);
                    let mappedStart, mappedEnd;
                    
                    const bd = b.booking_date ? dayjs(b.booking_date).format('YYYY-MM-DD') : '';
                    
                    if (bd === selDateStr) {
                        // Bắt đầu trong ngày đang chọn
                        mappedStart = s;
                        mappedEnd = (e <= s && e !== 24) ? e + 24 : e;
                    } else {
                        // Bắt đầu từ ngày hôm trước, kéo dài sang ngày đang chọn
                        mappedStart = 0; // chỉ xét từ 0h hôm nay
                        mappedEnd = e;
                    }

                    for (let i = mappedStart; i < mappedEnd; i++) {
                        if (i < 30) hours.push(i);
                    }
                });
                setMockBookedSlots([...new Set(hours)]);
            } catch (err) {
                console.error('Lỗi tải lịch đặt:', err);
            }
        };
        load();
    }, [selectedChargerPort, selectedDate, refreshTrigger]);

    // ─── Filter stations ───────────────────────────────────────────────────────
    useEffect(() => {
        let result = [...allStations];
        if (filters.search)
            result = result.filter(s =>
                s.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                s.address.toLowerCase().includes(filters.search.toLowerCase())
            );
        if (filters.type === 'fast') result = result.filter(s => s.total_chargers > 2);
        if (filters.type === 'normal') result = result.filter(s => s.total_chargers > 0 && s.total_chargers <= 2);
        if (filters.price === 'low') result = result.filter(s => s.price && Number(s.price) < 4000);
        if (filters.price === 'high') result = result.filter(s => s.price && Number(s.price) >= 4000);
        setStations(result);
    }, [filters, allStations]);

    // ─── API helpers ───────────────────────────────────────────────────────────
    const fetchStations = async () => {
        try {
            const data = await stationService.getAll();
            setStations(data);
            setAllStations(data);
        } catch {
            message.error('Không thể tải danh sách trạm sạc');
        }
    };

    const fetchRecommendations = async (lat, lng) => {
        try { await stationService.getRecommendations(lat, lng); }
        catch { console.error('Failed to fetch recommendations'); }
    };

    const getMyCurrentLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                setUserLocation([latitude, longitude]);
                setMapCenter([latitude, longitude]);
                setMapZoom(14);
                fetchRecommendations(latitude, longitude);
            },
            err => console.error('Lỗi GPS ban đầu:', err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // ─── Init & socket ─────────────────────────────────────────────────────────
    useEffect(() => {
        fetchStations();
        fetchRecommendations();
        getMyCurrentLocation();

        socket.on('chargerStatusChanged', (data) => {
            fetchStations();
            if (selectedStation?.id === data.stationId)
                stationService.getChargers(data.stationId).then(setChargers);
        });
        return () => socket.off('chargerStatusChanged');
    }, [selectedStation]);

    // Open station from router state (e.g. navigated from Favorites)
    useEffect(() => {
        if (location.state?.openStationId && stations.length > 0) {
            const station = stations.find(s => s.id === location.state.openStationId);
            if (station) {
                handleMarkerClick(station);
                setMapCenter([Number(station.latitude), Number(station.longitude)]);
                setMapZoom(16);
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, stations]);

    // ─── Station handlers ──────────────────────────────────────────────────────
    const handleMarkerClick = async (station) => {
        setSelectedStation(station);
        setDrawerVisible(true);
        setRouteCoordinates([]);
        setRouteBounds([]);
        setRouteInfo(null);
        try {
            const data = await stationService.getChargers(station.id);
            setChargers(data);
        } catch {
            message.error('Không thể tải thông tin trụ sạc');
        }
    };

    const handleBooking = () => {
        if (!user) { message.error('Vui lòng đăng nhập để đặt lịch sạc'); return; }
        setBookingModalVisible(true);
        setBookingStep(1);
        setSelectedChargerPort(null);
        setSelectedTimeSlots([]);
        setMockBookedSlots([]);
    };

    const handleFindNearMe = () => {
        if (!navigator.geolocation) return message.error('Trình duyệt không hỗ trợ định vị');
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async ({ coords: { latitude, longitude } }) => {
                try {
                    setUserLocation([latitude, longitude]);
                    const data = await stationService.getNear(latitude, longitude);
                    setStations(data);
                    setAllStations(data);
                    setMapCenter([latitude, longitude]);
                    setMapZoom(15);
                    message.success(`Tìm thấy ${data.length} trạm xung quanh bạn`);
                } catch { message.error('Lỗi khi tìm trạm gần nhất'); }
                finally { setLoading(false); }
            },
            (err) => { console.error(err); message.error('Không thể lấy vị trí. Vui lòng bật GPS.'); setLoading(false); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleSearch = async (value) => {
        if (!value) return;
        try {
            setLoading(true);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1`);
            const data = await res.json();
            if (data?.length > 0) {
                const { lat, lon } = data[0];
                setMapCenter([parseFloat(lat), parseFloat(lon)]);
                setMapZoom(15);
                fetchRecommendations(lat, lon);
            }
        } catch (err) { console.error('Geocoding error:', err); }
        finally { setLoading(false); }
    };

    const handleFilterChange = (key, value) =>
        setFilters(prev => ({ ...prev, [key]: value }));

    // Routing
    const calculateRoute = async (start, end) => {
        setRoutingLoading(true);
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.code === 'Ok' && data.routes?.length > 0) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
                setRouteCoordinates(coords);
                setRouteBounds(coords);
                setRouteInfo({
                    distance: (route.distance / 1000).toFixed(2),
                    duration: Math.round(route.duration / 60),
                });
                setDrawerVisible(false);
                message.success(`Đường đi ngắn nhất: ${(route.distance / 1000).toFixed(2)} km (${Math.round(route.duration / 60)} phút)`);
            } else {
                message.error('Không tìm thấy tuyến đường phù hợp');
            }
        } catch { message.error('Không thể tính toán chỉ đường. Thử lại sau!'); }
        finally { setRoutingLoading(false); }
    };

    const handleDrawRoute = async (station) => {
        const dest = [Number(station.latitude), Number(station.longitude)];
        if (!userLocation) {
            if (!navigator.geolocation) return message.error('Trình duyệt không hỗ trợ định vị');
            message.info('Đang xác định vị trí hiện tại...');
            navigator.geolocation.getCurrentPosition(
                async ({ coords: { latitude, longitude } }) => {
                    const loc = [latitude, longitude];
                    setUserLocation(loc);
                    setMapCenter(loc);
                    await calculateRoute(loc, dest);
                },
                () => message.error('Không thể lấy vị trí. Vui lòng bật GPS.'),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            await calculateRoute(userLocation, dest);
        }
    };

    const clearRoute = () => { setRouteCoordinates([]); setRouteBounds([]); setRouteInfo(null); };

    // Navigation
    const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
        const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const checkOffRoute = (pos, polyline, dest) => {
        if (!polyline.length) return;
        const min = Math.min(...polyline.map(pt => getDistanceInMeters(pos[0], pos[1], pt[0], pt[1])));
        if (min > 50) {
            message.warning('Bạn đã đi chệch hướng! Đang tính lại đường đi...');
            calculateRoute(pos, dest);
        }
    };

    const startNavigation = () => {
        if (!navigator.geolocation) return message.error('Trình duyệt không hỗ trợ định vị');
        setNavigationActive(true);
        message.success('Bắt đầu dẫn đường GPS thực tế');

        // Initial position to zoom in
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                setUserLocation([latitude, longitude]);
                setMapCenter([latitude, longitude]);
                setMapZoom(17);
            },
            () => { },
            { enableHighAccuracy: true, timeout: 5000 }
        );

        const dest = [Number(selectedStation.latitude), Number(selectedStation.longitude)];
        watchIdRef.current = navigator.geolocation.watchPosition(
            ({ coords: { latitude, longitude } }) => {
                const pos = [latitude, longitude];
                setUserLocation(pos);
                setMapCenter(pos);
                const dist = getDistanceInMeters(latitude, longitude, dest[0], dest[1]);
                setRouteInfo(prev => prev
                    ? { ...prev, distance: (dist / 1000).toFixed(2), duration: Math.ceil(dist / 500) }
                    : null
                );
                if (dist < 20) {
                    message.success(`Bạn đã đến ${selectedStation.name}!`);
                    stopNavigation();
                    return;
                }
                checkOffRoute(pos, routeCoordinates, dest);
            },
            (err) => { console.error(err); message.error('Lỗi định vị GPS!'); setNavigationActive(false); },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    };

    const stopNavigation = () => {
        setNavigationActive(false);
        if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
        if (simIntervalRef.current) { clearInterval(simIntervalRef.current); simIntervalRef.current = null; }
        clearRoute();
        message.info('Đã dừng dẫn đường');
    };

    // Time slot selection
    const toggleTimeSlot = (hour) => {
        const isToday = selectedDate.isSame(dayjs(), 'day');
        if (isToday && hour <= dayjs().hour()) return;
        if (mockBookedSlots.includes(hour)) return;

        setSelectedTimeSlots(prev => {
            let current = prev.filter(h => h !== 30);
            let next = [];

            if (current.length === 0) {
                next = [hour];
            } else {
                const min = Math.min(...current), max = Math.max(...current);
                if (current.length === 1 && current[0] === hour) {
                    next = [];
                } else if (current.includes(hour)) {
                    if (hour === max) next = current.filter(h => h !== max);
                    else if (hour === min) next = current.filter(h => h !== min);
                    else { for (let i = min; i <= hour; i++) next.push(i); }
                } else if (hour === max + 1) {
                    next = [...current, hour].sort((a, b) => a - b);
                } else if (hour === min - 1) {
                    next = [hour, ...current].sort((a, b) => a - b);
                } else if (current.length === 1) {
                    const s = Math.min(current[0], hour), e = Math.max(current[0], hour);
                    for (let i = s; i <= e; i++) {
                        if (mockBookedSlots.includes(i)) {
                            message.error('Có khung giờ đã đặt ở giữa. Vui lòng chọn lại.');
                            return [hour];
                        }
                    }
                    for (let i = s; i <= e; i++) next.push(i);
                } else {
                    next = [hour];
                }
            }
            if (next.length > 0 && Math.min(...next) >= 24) {
                next = [];
            }
            return next;
        });
    };

    // Payment  
    const handlePayment = async () => {
        if (selectedTimeSlots.length < 1) return;
        setIsProcessingPayment(true);
        message.loading({ content: 'Đang khởi tạo thanh toán...', key: 'payment' });
        
        const minSlot = Math.min(...selectedTimeSlots);
        const startTime = `${(minSlot >= 24 ? minSlot - 24 : minSlot).toString().padStart(2, '0')}:00`;
        
        let maxSlot = Math.max(...selectedTimeSlots);
        let endSlot = maxSlot + 1;
        const endTime = `${(endSlot >= 24 ? (endSlot === 24 ? 0 : endSlot - 24) : endSlot).toString().padStart(2, '0')}:00`;

        try {
            const res = await bookingService.create({
                charger_id: selectedChargerPort,
                booking_date: selectedDate.format('YYYY-MM-DD'),
                start_time: startTime,
                end_time: endTime,
                estimated_kwh: estimatedCost.kwh,
                cost: estimatedCost.cost,
            });
            message.destroy('payment');
            
            // Redirect sang PayOS
            if (res?.checkoutUrl) {
                window.location.href = res.checkoutUrl;
            } else {
                message.error('Không tìm thấy link thanh toán!');
                setIsProcessingPayment(false);
            }
        } catch (err) {
            console.error(err);
            message.error({ content: err.response?.data?.error || 'Không thể đặt lịch. Vui lòng thử lại!', key: 'payment', duration: 3 });
            setIsProcessingPayment(false);
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 80px)', position: 'relative', overflow: 'hidden', margin: '-10px' }}>

            {/* ── Left: Search Panel ── */}
            <SearchPanel
                stations={stations}
                selectedStation={selectedStation}
                loading={loading}
                favorites={favorites}
                onFilterChange={handleFilterChange}
                onSearch={handleSearch}
                onFindNearMe={handleFindNearMe}
                onStationClick={handleMarkerClick}
            />

            {/* ── Center: Map ── */}
            <MapView
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                routeBounds={routeBounds}
                userLocation={userLocation}
                userLocationIcon={userLocationIcon}
                routeCoordinates={routeCoordinates}
                stations={stations}
                onMarkerClick={handleMarkerClick}
            />

            {/* ── Bottom: Route Info Widget ── */}
            <RouteInfoWidget
                routeInfo={routeInfo}
                selectedStation={selectedStation}
                navigationActive={navigationActive}
                onStartNavigation={startNavigation}
                onStopNavigation={stopNavigation}
                onClearRoute={clearRoute}
            />

            {/* ── Right: Station Detail Drawer ── */}
            <StationDrawer
                visible={drawerVisible}
                selectedStation={selectedStation}
                chargers={chargers}
                routeInfo={routeInfo}
                routingLoading={routingLoading}
                favorites={favorites}
                user={user}
                onClose={() => setDrawerVisible(false)}
                onDrawRoute={handleDrawRoute}
                onBooking={handleBooking}
                onToggleFavorite={toggleFavorite}
            />

            {/* ── Modal: Booking ── */}
            <BookingModal
                visible={bookingModalVisible}
                onCancel={() => setBookingModalVisible(false)}
                bookingStep={bookingStep}
                selectedStation={selectedStation}
                chargers={chargers}
                selectedChargerPort={selectedChargerPort}
                onChargerPortChange={(val) => {
                    setSelectedChargerPort(val);
                    setSelectedTimeSlots([]);
                    setMockBookedSlots([]);
                }}
                selectedDate={selectedDate}
                onDateChange={(date) => { setSelectedDate(date); setSelectedTimeSlots([]); }}
                selectedTimeSlots={selectedTimeSlots}
                onToggleTimeSlot={toggleTimeSlot}
                mockBookedSlots={mockBookedSlots}
                estimatedCost={estimatedCost}
                isProcessingPayment={isProcessingPayment}
                onPayment={handlePayment}
            />

        </div>
    );
};

export default UserHome;

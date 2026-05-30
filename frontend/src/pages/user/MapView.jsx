import React from 'react';
import { Tag, Typography } from 'antd';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import MapController from './MapController';

const { Text } = Typography;
const MapView = ({
    mapCenter,
    mapZoom,
    routeBounds,
    userLocation,
    userLocationIcon,
    routeCoordinates,
    stations,
    onMarkerClick,
}) => {
    return (
        <div style={{ height: '100%', width: '100%' }}>
            <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
            >
                <MapController center={mapCenter} zoom={mapZoom} bounds={routeBounds} />

                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* User location */}
                {userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon}>
                        <Popup>
                            <div style={{ fontWeight: 'bold', color: '#1890ff' }}>Vị trí của bạn</div>
                        </Popup>
                    </Marker>
                )}

                {/* Route polyline */}
                {routeCoordinates.length > 0 && (
                    <Polyline
                        positions={routeCoordinates}
                        color="#1890ff"
                        weight={6}
                        opacity={0.8}
                    />
                )}

                {/* Station markers */}
                <MarkerClusterGroup chunkedLoading>
                    {stations
                        .filter(s => s.latitude && s.longitude)
                        .map((station) => (
                            <Marker
                                key={station.id}
                                position={[Number(station.latitude), Number(station.longitude)]}
                                eventHandlers={{ click: () => onMarkerClick(station) }}
                            >
                                <Popup>
                                    <div style={{ padding: 4 }}>
                                        <Text strong>{station.name}</Text>
                                        <br />
                                        <div style={{ marginTop: 4 }}>
                                            {station.max_power && (
                                                <Tag color="purple" style={{ margin: 0 }}>
                                                    {station.max_power} kW
                                                </Tag>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
};

export default MapView;

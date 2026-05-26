import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * MapController - Internal Leaflet map control component.
 * Must be rendered inside a <MapContainer>.
 * Smoothly flies/fits map to given center, zoom, or bounds.
 */
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

export { MapController };
export default MapController;

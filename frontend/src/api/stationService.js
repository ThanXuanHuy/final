import axiosClient from './axiosClient';

const stationService = {
    getAll: () => axiosClient.get('/api/stations'),
    getOne: (id) => axiosClient.get(`/api/stations/${id}`),
    getNear: (lat, lng, limit = 20) => axiosClient.get(`/api/stations/near?lat=${lat}&lng=${lng}&limit=${limit}`),
    getRecommendations: (lat, lng) => axiosClient.get(`/api/stations/recommendations?lat=${lat}&lng=${lng}`),
    getChargers: (stationId) => axiosClient.get(`/api/stations/${stationId}/chargers`),

    // Admin methods
    create: (data) => axiosClient.post('/api/stations', data),
    update: (id, data) => axiosClient.put(`/api/stations/${id}`, data),
    delete: (id) => axiosClient.delete(`/api/stations/${id}`),

    addCharger: (data) => axiosClient.post('/api/chargers', data),
    updateCharger: (id, data) => axiosClient.put(`/api/chargers/${id}`, data),
    deleteCharger: (id) => axiosClient.delete(`/api/chargers/${id}`),
};

export default stationService;

import axiosClient from './axiosClient';

const stationService = {
    getAll: () => axiosClient.get('/stations'),
    getOne: (id) => axiosClient.get(`/stations/${id}`),
    getNear: (lat, lng) => axiosClient.get(`/stations/near?lat=${lat}&lng=${lng}`),
    getRecommendations: (lat, lng) => axiosClient.get(`/stations/recommendations?lat=${lat}&lng=${lng}`),
    getChargers: (stationId) => axiosClient.get(`/stations/${stationId}/chargers`),

    // Admin methods
    create: (data) => axiosClient.post('/stations', data),
    update: (id, data) => axiosClient.put(`/stations/${id}`, data),
    delete: (id) => axiosClient.delete(`/stations/${id}`),

    addCharger: (data) => axiosClient.post('/chargers', data),
    updateCharger: (id, data) => axiosClient.put(`/chargers/${id}`, data),
    deleteCharger: (id) => axiosClient.delete(`/chargers/${id}`),
};

export default stationService;

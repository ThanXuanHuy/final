import axiosClient from './axiosClient';

const bookingService = {
    create: (bookingData) => {
        return axiosClient.post('/api/bookings', bookingData);
    },
    getByUser: (userId) => {
        return axiosClient.get(`/api/bookings/user/${userId}`);
    },
    cancel: (id) => {
        return axiosClient.patch(`/api/bookings/${id}/cancel`);
    },
    getAll: () => {
        return axiosClient.get('/api/bookings');
    },
    updateStatus: (id, status) => {
        return axiosClient.patch(`/api/bookings/${id}/status`, { status });
    },
    getChargerSlots: (chargerId, date) => {
        return axiosClient.get(`/api/bookings/charger/${chargerId}/slots?date=${date}`);
    }
};

export default bookingService;

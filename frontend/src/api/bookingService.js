import axiosClient from './axiosClient';

const bookingService = {
    create: (bookingData) => {
        return axiosClient.post('/bookings', bookingData);
    },
    getByUser: (userId) => {
        return axiosClient.get(`/users/${userId}/bookings`);
    },
    cancel: (id) => {
        return axiosClient.patch(`/bookings/${id}/cancel`);
    },
    getAll: () => {
        return axiosClient.get('/bookings');
    },
    updateStatus: (id, status) => {
        return axiosClient.patch(`/bookings/${id}/status`, { status });
    }
};

export default bookingService;

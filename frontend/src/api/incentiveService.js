import axiosClient from './axiosClient';

const incentiveService = {
    getAll: () => {
        return axiosClient.get('/api/incentives');
    },
    getById: (id) => {
        return axiosClient.get(`/api/incentives/${id}`);
    },
    register: (data) => {
        return axiosClient.post('/api/incentives/register', data);
    },
    create: (data) => {
        return axiosClient.post('/api/incentives', data);
    },
    delete: (id) => {
        return axiosClient.delete(`/api/incentives/${id}`);
    },
    getUserRegistrations: (userId) => {
        return axiosClient.get(`/api/incentives/user/${userId}`);
    },
    getAllRegistrations: () => {
        return axiosClient.get('/api/admin/incentive-registrations');
    },
    updateRegistrationStatus: (id, status) => {
        return axiosClient.patch(`/api/admin/incentive-registrations/${id}`, { status });
    },
    deleteRegistration: (id) => {
        return axiosClient.delete(`/api/admin/incentive-registrations/${id}`);
    },
    update: (id, data) => {
        return axiosClient.put(`/api/incentives/${id}`, data);
    }
};

export default incentiveService;

import axiosClient from './axiosClient';

const incentiveService = {
    getAll: () => {
        return axiosClient.get('/incentives');
    },
    getById: (id) => {
        return axiosClient.get(`/incentives/${id}`);
    },
    register: (data) => {
        return axiosClient.post('/incentives/register', data);
    },
    create: (data) => {
        return axiosClient.post('/incentives', data);
    },
    delete: (id) => {
        return axiosClient.delete(`/incentives/${id}`);
    },
    getUserRegistrations: (userId) => {
        return axiosClient.get(`/incentives/user/${userId}`);
    },
    getAllRegistrations: () => {
        return axiosClient.get('/admin/incentive-registrations');
    },
    updateRegistrationStatus: (id, status) => {
        return axiosClient.patch(`/admin/incentive-registrations/${id}`, { status });
    }
};

export default incentiveService;

import axiosClient from './axiosClient';

const userService = {
    getAll: () => axiosClient.get('/admin/users'),
    updateStatus: (id, status) => axiosClient.patch(`/admin/users/${id}/status`, { status }),
    updateRole: (id, role) => axiosClient.patch(`/admin/users/${id}/role`, { role }),

    // Personal Profile
    getProfile: () => axiosClient.get('/users/profile'),
    updateProfile: (data) => axiosClient.put('/users/profile', data),

    // Stats & Analytics
    getStats: () => axiosClient.get('/admin/stats'),
    getPrediction: () => axiosClient.get('/admin/prediction'),
    getPersonalAnalytics: (userId) => axiosClient.get(`/analytics/personal/${userId}`),

    // Conversion report
    getConversionReport: () => axiosClient.get('/admin/reports/conversion'),
};

export default userService;

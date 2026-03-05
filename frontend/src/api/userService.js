import axiosClient from './axiosClient';

const userService = {
    getAll: () => axiosClient.get('/users'),
    updateStatus: (id, status) => axiosClient.patch(`/users/${id}/status`, { status }),
    updateRole: (id, role) => axiosClient.patch(`/users/${id}/role`, { role }),

    // Stats & Analytics
    getStats: () => axiosClient.get('/admin/stats'),
    getPrediction: () => axiosClient.get('/admin/prediction'),
    getPersonalAnalytics: (userId) => axiosClient.get(`/analytics/personal/${userId}`),

    // Conversion report
    getConversionReport: () => axiosClient.get('/admin/reports/conversion'),
};

export default userService;

import axiosClient from './axiosClient';

const userService = {
    getAll: () => axiosClient.get('/api/admin/users'),
    updateStatus: (id, status) => axiosClient.patch(`/api/admin/users/${id}/status`, { status }),
    updateRole: (id, role) => axiosClient.patch(`/api/admin/users/${id}/role`, { role }),
    updateUser: (id, data) => axiosClient.put(`/api/admin/users/${id}`, data),
    deleteUser: (id) => axiosClient.delete(`/api/admin/users/${id}`),

    // Personal Profile
    getProfile: () => axiosClient.get('/api/users/profile'),
    updateProfile: (data) => axiosClient.put('/api/users/profile', data),
    changePassword: (data) => axiosClient.put('/api/users/change-password', data),
    uploadAvatar: (formData) => axiosClient.post('/api/users/upload-avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }),

    // Stats & Analytics
    getStats: (startDate, endDate) => {
        let url = '/api/admin/stats';
        if (startDate && endDate) {
            url += `?startDate=${startDate}&endDate=${endDate}`;
        }
        return axiosClient.get(url);
    },
    getPrediction: () => axiosClient.get('/api/admin/prediction'),
    getPersonalAnalytics: (userId) => axiosClient.get(`/api/analytics/personal/${userId}`),

    // Conversion report
    getConversionReport: () => axiosClient.get('/api/admin/reports/conversion'),
    getRevenueDeepDive: () => axiosClient.get('/api/admin/reports/revenue-deep-dive')
};

export default userService;

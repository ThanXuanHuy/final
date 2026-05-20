import axiosClient from './axiosClient';

const userService = {
    getAll: () => axiosClient.get('/admin/users'),
    updateStatus: (id, status) => axiosClient.patch(`/admin/users/${id}/status`, { status }),
    updateRole: (id, role) => axiosClient.patch(`/admin/users/${id}/role`, { role }),
    updateUser: (id, data) => axiosClient.put(`/admin/users/${id}`, data),
    deleteUser: (id) => axiosClient.delete(`/admin/users/${id}`),

    // Personal Profile
    getProfile: () => axiosClient.get('/users/profile'),
    updateProfile: (data) => axiosClient.put('/users/profile', data),
    changePassword: (data) => axiosClient.put('/users/change-password', data),
    uploadAvatar: (formData) => axiosClient.post('/users/upload-avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }),

    // Stats & Analytics
    getStats: (startDate, endDate) => {
        let url = '/admin/stats';
        if (startDate && endDate) {
            url += `?startDate=${startDate}&endDate=${endDate}`;
        }
        return axiosClient.get(url);
    },
    getPrediction: () => axiosClient.get('/admin/prediction'),
    getPersonalAnalytics: (userId) => axiosClient.get(`/analytics/personal/${userId}`),

    // Conversion report
    getConversionReport: () => axiosClient.get('/admin/reports/conversion'),
    getRevenueDeepDive: () => axiosClient.get('/admin/reports/revenue-deep-dive')
};

export default userService;

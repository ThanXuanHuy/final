import axiosClient from './axiosClient';

const authService = {
    login: (credentials) => {
        return axiosClient.post('/api/auth/login', credentials);
    },
    register: (userData) => {
        return axiosClient.post('/api/auth/register', userData);
    }
};

export default authService;

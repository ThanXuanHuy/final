import axiosClient from './axiosClient';

const authService = {
    login: (credentials) => {
        return axiosClient.post('/auth/login', credentials);
    },
    register: (userData) => {
        return axiosClient.post('/auth/register', userData);
    }
};

export default authService;

import axiosClient from './axiosClient';

const authService = {
    login: (credentials) => {
        return axiosClient.post('/login', credentials);
    },
    register: (userData) => {
        return axiosClient.post('/register', userData);
    }
};

export default authService;

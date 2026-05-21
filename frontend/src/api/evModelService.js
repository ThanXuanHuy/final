import api from './axiosClient';

const evModelService = {
    getAll: () => {
        return api.get('/api/ev-models');
    },
    
    create: (data) => {
        return api.post('/api/ev-models', data);
    },
    
    update: (id, data) => {
        return api.put(`/api/ev-models/${id}`, data);
    },
    
    delete: (id) => {
        return api.delete(`/api/ev-models/${id}`);
    }
};

export default evModelService;

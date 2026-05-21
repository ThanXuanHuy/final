import api from './axiosClient';

const evModelService = {
    getAll: () => {
        return api.get('/ev-models');
    },
    
    create: (data) => {
        return api.post('/ev-models', data);
    },
    
    update: (id, data) => {
        return api.put(`/ev-models/${id}`, data);
    },
    
    delete: (id) => {
        return api.delete(`/ev-models/${id}`);
    }
};

export default evModelService;

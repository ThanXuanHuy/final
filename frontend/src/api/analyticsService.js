import axiosClient from './axiosClient';

const analyticsService = {
  getPersonalStats: (userId) => {
    return axiosClient.get(`/api/analytics/personal/${userId}`);
  },
  getPricePrediction: () => {
    return axiosClient.get('/api/analytics/price-prediction');
  }
};

export default analyticsService;

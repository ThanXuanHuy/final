import axiosClient from './axiosClient';

const analyticsService = {
  getPersonalStats: (userId) => {
    return axiosClient.get(`/analytics/personal/${userId}`);
  },
  getPricePrediction: () => {
    return axiosClient.get('/analytics/price-prediction');
  }
};

export default analyticsService;

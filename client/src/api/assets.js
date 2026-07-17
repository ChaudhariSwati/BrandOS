import api from './client';

export const listAssets = (type) => api.get('/assets', { params: { type } });
export const getAsset = (id) => api.get(`/assets/${id}`);
export const createAsset = (data) => api.post('/assets', data);
export const updateAsset = (id, data) => api.put(`/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/assets/${id}`);
export const renderCard = (assetId) => api.post('/export/render-card', { assetId });
export const renderPdf = (assetId) => api.post('/export/render-pdf', { assetId });

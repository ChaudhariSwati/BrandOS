import api from './client';

export const listBrandKits = () => api.get('/brandkits');
export const getBrandKit = (id) => api.get(`/brandkits/${id}`);
export const createBrandKit = (data) => api.post('/brandkits', data);
export const updateBrandKit = (id, data) => api.put(`/brandkits/${id}`, data);
export const deleteBrandKit = (id) => api.delete(`/brandkits/${id}`);
export const uploadLogo = (id, file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return api.post(`/brandkits/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const setActiveKit = (id) => api.post(`/brandkits/${id}/set-active`);
export const extractColors = (imageUrl) => api.post('/brandkits/extract-colors', { imageUrl });

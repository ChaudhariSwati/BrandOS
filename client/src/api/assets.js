import api from './client';

export const listAssets = (type) => api.get('/assets', { params: { type } });
export const getAsset = (id) => api.get(`/assets/${id}`);
export const createAsset = (data) => api.post('/assets', data);
export const updateAsset = (id, data) => api.put(`/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/assets/${id}`);
export const renderCard = (assetId) => api.post('/export/render-card', { assetId });
export const renderPdf = (assetId) => api.post('/export/render-pdf', { assetId });

/**
 * Direct PDF download via streaming endpoint (no Chromium needed).
 * Uses fetch instead of axios to handle binary response properly.
 */
export const downloadAsset = async (assetId, filename) => {
  const token = localStorage.getItem('accessToken');
  const BASE_URL = import.meta.env.VITE_API_URL || '/api';
  const response = await fetch(`${BASE_URL}/export/download/${assetId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `export-${assetId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

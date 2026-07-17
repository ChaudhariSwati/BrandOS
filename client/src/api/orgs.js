import api from './client';

export const getCurrentOrg = () => api.get('/orgs/current');
export const updateOrg = (data) => api.put('/orgs/current', data);
export const getMembers = () => api.get('/orgs/members');
export const addMember = (data) => api.post('/orgs/members', data);
export const getStats = () => api.get('/orgs/stats');

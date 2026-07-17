import api from './client';

export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const signupUser = (name, email, password, orgName) =>
  api.post('/auth/signup', { name, email, password, orgName });
export const getMe = () => api.get('/auth/me');

import api from './client';

export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const signupUser = (name, email, password, orgName) =>
  api.post('/auth/signup', { name, email, password, orgName });
export const googleLoginUser = (credential) => api.post('/auth/google', { credential });
export const getMe = () => api.get('/auth/me');
export const logoutUser = () => api.post('/auth/logout');
export const refreshToken = () => api.post('/auth/refresh');
export const demoLogin = () => api.post('/demo/login');

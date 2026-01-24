import axios from 'axios';
import { API_URL, ENDPOINTS } from '../config/api';
import { authService } from './authService';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method?.toUpperCase(), config.baseURL + config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, 'Status:', response.status);
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error('API Error:', error.config?.url, error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.config?.url, 'No response received');
      console.error('Request details:', error.request);
    } else {
      console.error('Request Setup Error:', error.message);
    }
    
    if (error.response?.status === 401) {
      await authService.clearAuth();
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  async login(email, password) {
    const response = await apiClient.post(ENDPOINTS.LOGIN, { email, password });
    return response.data;
  },

  async register(name, email, password) {
    const response = await apiClient.post(ENDPOINTS.REGISTER, { name, email, password });
    return response.data;
  },

  async verifyToken() {
    const response = await apiClient.get(ENDPOINTS.VERIFY);
    return response.data;
  },

  async uploadDocument(file, title, type) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType || 'application/pdf',
      name: file.name || 'document.pdf',
    });
    formData.append('title', title);
    formData.append('type', type);

    const response = await apiClient.post(ENDPOINTS.UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getDocuments() {
    const response = await apiClient.get(ENDPOINTS.DOCUMENTS);
    return response.data;
  },

  async analyzeDocument(documentId) {
    const response = await apiClient.post(`${ENDPOINTS.ANALYZE}/${documentId}`);
    return response.data;
  },

  async deleteDocument(documentId) {
    const response = await apiClient.delete(`${ENDPOINTS.DOCUMENTS}/${documentId}`);
    return response.data;
  },

  async translateAnalysis(analysis, targetLang) {
    try {
      const response = await apiClient.post(ENDPOINTS.TRANSLATE_ANALYSIS, {
        analysis,
        target_lang: targetLang,
      });
      return response.data;
    } catch (error) {
      console.error('Translation API error:', error);
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Translation request timed out. Please try again.');
      }
      if (!error.response) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  },

  async getLanguages() {
    const response = await apiClient.get(ENDPOINTS.LANGUAGES);
    return response.data;
  },
};

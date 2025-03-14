/**
 * Axios Configuration for Next.js 15 compatibility
 *
 * This file creates a configured axios instance that automatically
 * uses absolute URLs for all requests, which is required for Next.js 15.
 */

import axios from 'axios';
import { getBaseUrl } from './url-helper';

// Create a configured axios instance
const api = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : getBaseUrl(),
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to handle errors consistently
api.interceptors.request.use(
  (config) => {
    // You can add auth tokens or other common headers here
    return config;
  },
  (error) => {
    console.error('Axios request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log all axios errors
    console.error('Axios response error:', error?.response?.data || error?.message || error);
    
    // You can add custom error handling here, like auto-retry for 5xx errors
    // or redirect on 401 unauthorized
    
    return Promise.reject(error);
  }
);

export default api; 
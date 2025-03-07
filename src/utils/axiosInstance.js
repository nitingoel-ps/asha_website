// src/utils/axiosInstance.js
import axios from 'axios';

const apiBaseURL = process.env.REACT_APP_API_BASE_URL;

// Function to get CSRF token from cookies
function getCsrfToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Create a function that will be set from outside to update user context
let updateUserFunction = null;

export const setUserUpdateFunction = (fn) => {
  updateUserFunction = fn;
};

// Function to fetch and update user context
const updateUserContext = async () => {
  if (updateUserFunction) {
    try {
      const userResponse = await axiosInstance.get('/user-context');
      updateUserFunction(userResponse.data);
    } catch (error) {
      console.error('Error fetching user context:', error);
    }
  }
};

// Add debug logging to the axios instance creation
const axiosInstance = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true, // Enable sending cookies
  timeout: 60000,  //Made very long for the /chat API
  headers: {
    Authorization: localStorage.getItem('access_token')
      ? 'Bearer ' + localStorage.getItem('access_token')
      : null,
    'Content-Type': 'application/json',
    accept: 'application/json',
    'X-CSRFToken': getCsrfToken(), // Add CSRF token
    'ngrok-skip-browser-warning': 'whatever',
  },
});

console.log("Axios instance created with token:", 
  localStorage.getItem('access_token') ? 'Bearer token exists' : 'No bearer token');

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async function (error) {
    const originalRequest = error.config;
    console.log("Axios interceptor caught error:", error.response?.status);

    // Handle network errors or server not reachable
    if (!error.response) {
      console.error('Network Error:', error);
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }

    // Handle refresh token flow
    if (error.response.status === 401 || error.response.status === 403) { // Hack fix. True problem is that without refresh API calls do not have access tokens being sent.
      console.log("Authorization error, attempting token refresh");
      // If refresh token request fails, redirect to login
      if (originalRequest.url === apiBaseURL + '/token/refresh/') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        alert('Your session has expired. Please login again.');
        window.location.href = '/login/';
        return Promise.reject(error);
      }

      // Try to refresh token
      if (!originalRequest._retry) {
        try {
          originalRequest._retry = true;
          const refreshToken = localStorage.getItem('refresh_token');

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await axios.post(apiBaseURL + '/token/refresh/', {
            refresh: refreshToken
          });

          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          axiosInstance.defaults.headers['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          // After successful token refresh, update user context
          await updateUserContext();
          
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          alert('Your session has expired. Please login again.');
          window.location.href = '/login/';
          return Promise.reject(refreshError);
        }
      }
    }

    // Handle other specific error codes
    switch (error.response.status) {
      case 403:
        console.error('Forbidden:', error);
        throw new Error('You do not have permission to perform this action');
      case 404:
        console.error('Not Found:', error);
        throw new Error('The requested resource was not found');
      case 500:
        console.error('Server Error:', error);
        throw new Error('An internal server error occurred. Please try again later');
      default:
        console.error('API Error:', error);
        throw error;
    }
  }
);

// Add a request interceptor to ensure token is included in all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log("Adding auth header to request:", config.url);
    } else {
      console.log("No token available for request:", config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
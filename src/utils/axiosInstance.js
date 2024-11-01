// src/utils/axiosInstance.js
import axios from 'axios';

//const baseURL = 'http://127.0.0.1:8000/';
const apiBaseURL = process.env.REACT_APP_API_BASE_URL;

const axiosInstance = axios.create({
  baseURL: apiBaseURL,
  timeout: 5000,
  headers: {
    Authorization: localStorage.getItem('access_token')
      ? 'Bearer ' + localStorage.getItem('access_token')
      : null,
    'Content-Type': 'application/json',
    accept: 'application/json',
  },
});

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async function (error) {
    const originalRequest = error.config;

    if (typeof error.response === 'undefined') {
      alert(
        'A server/network error occurred. ' +
          'Looks like CORS might be the problem. ' +
          'Sorry about this - we will get it fixed shortly.'
      );
      return Promise.reject(error);
    }

    if (
      error.response.status === 401 &&
      originalRequest.url === apiBaseURL + '/token/refresh/'
    ) {
      // Redirect to login page
      window.location.href = '/login/';
      return Promise.reject(error);
    }

    if (
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      return axios
        .post(apiBaseURL + '/token/refresh/', { refresh: refreshToken })
        .then((response) => {
          localStorage.setItem('access_token', response.data.access);
          axiosInstance.defaults.headers['Authorization'] =
            'Bearer ' + response.data.access;
          originalRequest.headers['Authorization'] =
            'Bearer ' + response.data.access;
          return axiosInstance(originalRequest);
        })
        .catch((err) => {
          console.log(err);
        });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
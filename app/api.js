import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3000/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const logToReactotron = (method, payload) => {
  const target = typeof console !== 'undefined' && console.tron ? console.tron : console;
  if (typeof target[method] === 'function') {
    target[method]({
      event: 'Reactotron API',
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }
};

apiClient.interceptors.request.use(
  (config) => {
    logToReactotron('log', {
      type: 'API_REQUEST',
      url: config.url,
      method: config.method,
      params: config.params,
      data: config.data,
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    logToReactotron('error', {
      type: 'API_REQUEST_ERROR',
      message: error?.message,
      config: error?.config,
    });
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    logToReactotron('log', {
      type: 'API_RESPONSE',
      url: response.config?.url,
      method: response.config?.method,
      status: response.status,
      data: response.data,
      headers: response.headers,
    });
    return response;
  },
  (error) => {
    const response = error?.response;
    logToReactotron('error', {
      type: 'API_RESPONSE_ERROR',
      message: error?.message,
      url: response?.config?.url || error?.config?.url,
      method: response?.config?.method || error?.config?.method,
      status: response?.status,
      data: response?.data,
      headers: response?.headers,
    });
    return Promise.reject(error);
  }
);

export default apiClient;

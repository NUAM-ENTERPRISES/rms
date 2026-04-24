# Reactotron Configuration

This document describes the Reactotron setup for the React Native app.

## Purpose

Reactotron is configured only in development to provide:

- React Native debugging
- API request/response tracking
- Global error forwarding
- Optional Redux action/state debugging

Production builds are unaffected by this setup.

## Files

- `app/ReactotronConfig.js` — development-only Reactotron bootstrap
- `app/index.js` — imports the config only when `__DEV__` is true
- `app/api.js` — reusable Axios client that logs requests and responses
- `app/src/store/store.ts` — optional Redux enhancer integration

## Reactotron bootstrap

### `app/ReactotronConfig.js`

Key behavior:

- Uses `require('reactotron-react-native')` at runtime
- Only runs in `__DEV__`
- Attaches Reactotron to `console.tron`
- Falls back to `console` if Reactotron is unavailable
- Overrides `console.error` in development to forward errors to Reactotron while preserving the original console output
- Optionally loads `reactotron-redux` if installed

Example code:

```js
let reactotron = null;

if (__DEV__) {
  try {
    const ReactotronImport = require('reactotron-react-native');
    const Reactotron = ReactotronImport.default || ReactotronImport;

    let instance = Reactotron.configure({
      name: 'RMS App',
    }).useReactNative({
      asyncStorage: false,
      networking: { ignoreUrls: /symbolicate/ },
    });

    try {
      const reactotronReduxImport = require('reactotron-redux');
      const reactotronRedux = reactotronReduxImport.default || reactotronReduxImport;
      if (typeof reactotronRedux === 'function') {
        instance = instance.use(reactotronRedux());
      }
    } catch {
      // reactotron-redux is optional and should not break the app.
    }

    reactotron = instance.connect();
    reactotron.clear?.();
  } catch (error) {
    reactotron = null;
  }

  const originalConsoleError = console.error?.bind(console);
  console.error = (...args) => {
    try {
      if (reactotron?.error) {
        reactotron.error(...args);
      }
    } catch {
      // Preserve original error output even if Reactotron logging fails.
    }

    originalConsoleError?.(...args);
  };
}

console.tron = reactotron || console;

export default reactotron;
```

## App entry integration

### `app/index.js`

Import `ReactotronConfig.js` only in development:

```js
/**
 * @format
 */

if (__DEV__) {
  require('./ReactotronConfig');
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

## API client tracing

### `app/api.js`

This file provides a reusable Axios client that logs:

- request URL, method, params, headers, body
- response status, data, headers
- request/response errors

Logs are sent to `console.tron` when available, otherwise they fall back to the regular console.

Example code:

```js
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
```

## Example API usage

```js
import apiClient from '../api';

const response = await apiClient.get('/auth/me');
```

## Error tracking

In development, `console.error` is forwarded to Reactotron.

Example usage:

```js
try {
  await apiClient.post('/login', { email, password });
} catch (error) {
  console.error('Login request failed', error);
}
```

## Optional Redux debugging

If `reactotron-redux` is installed, the app can add a Redux store enhancer in development only.

### `app/src/store/store.ts`

```ts
const reactotronEnhancer = (() => {
  if (__DEV__) {
    try {
      const configModule = require('../../ReactotronConfig');
      const reactotron = configModule?.default || configModule;
      return reactotron?.createEnhancer?.();
    } catch {
      return undefined;
    }
  }
  return undefined;
})();

export const store = configureStore({
  reducer: { ... },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(baseApi.middleware)
      .concat(authApi.middleware),
  enhancers: (defaultEnhancers) => [
    ...defaultEnhancers,
    ...(reactotronEnhancer ? [reactotronEnhancer] : []),
  ],
});
```

## Notes

- Everything is guarded by `__DEV__` and runtime `require`.
- Reactotron does not affect production builds.
- `console.tron` is safe in production because it falls back to the regular console.

import { render, RenderOptions } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "@/services/authApi";
import authReducer from "@/features/auth/authSlice";
import { ReactElement } from "react";

// Create a test store with minimal configuration
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
  });
};

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(),
    route = "/",
    ...renderOptions
  }: RenderOptions & {
    preloadedState?: any;
    store?: ReturnType<typeof createTestStore>;
    route?: string;
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    );
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

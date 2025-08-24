import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./App.tsx";
import "./index.css";

// Performance measurement
performance.mark("app:start");

// Web Vitals measurement (silent - no console logs)
import("web-vitals").then(({ onLCP, onINP, onCLS }) => {
  onLCP((metric: any) => {
    // LCP measurement - can be sent to analytics service
    performance.mark(`lcp-${metric.value}`);
  });
  onINP((metric: any) => {
    // INP measurement - can be sent to analytics service
    performance.mark(`inp-${metric.value}`);
  });
  onCLS((metric: any) => {
    // CLS measurement - can be sent to analytics service
    performance.mark(`cls-${metric.value}`);
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

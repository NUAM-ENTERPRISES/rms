interface Reactotron {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  display: (config: any) => void;
}

declare global {
  interface Console {
    tron: Reactotron;
  }
}

export {};

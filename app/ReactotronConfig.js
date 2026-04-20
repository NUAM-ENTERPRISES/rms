let reactotron = null;

if (__DEV__) {
  try {
    const ReactotronImport = require('reactotron-react-native');
    const Reactotron = ReactotronImport.default || ReactotronImport;

    let instance = Reactotron.configure({
      name: 'RMS App',
      host: '10.0.2.2', // Standard Android emulator loopback
      port: 9090,
    }).useReactNative({
      asyncStorage: true,
      networking: { 
        ignoreUrls: /symbolicate|generate_204/,
      },
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
    
    if (reactotron) {
      console.log('🔌 Reactotron initialized on 10.0.2.2:9090');
      reactotron.clear?.();
    }
  } catch (error) {
    console.log('⚡️ Reactotron Setup Error:', error.message);
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

export const tron = reactotron;
export default reactotron;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = reactotron;
  module.exports.default = reactotron;
}

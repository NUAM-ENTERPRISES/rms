import React from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { store } from '@/store/store';
import AuthNavigator from './src/navigation/AuthNavigator';


const App = () => {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#000" 
          translucent={false}
        />
        <AuthNavigator />
      </NavigationContainer>
    </Provider>
  );
};

export default App;
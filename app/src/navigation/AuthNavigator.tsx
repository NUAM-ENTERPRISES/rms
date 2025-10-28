import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootState, AppDispatch } from '../store/store';
import { loadStoredTokens } from '../features/auth/authSlice';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RoleBasedNavigator from './RoleBasedNavigator';

const Stack = createNativeStackNavigator();

/**
 * AuthNavigator - Professional Authentication Flow
 * 
 * Responsibilities:
 * 1. App initialization (splash screen)
 * 2. Token loading and authentication check
 * 3. Navigate between auth and main app
 */
const AuthNavigator = () => {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 App initializing...');
        
        // Load stored authentication tokens
        await dispatch(loadStoredTokens());
        
        console.log('✅ Tokens loaded, checking authentication...');
        
        // Minimum splash time for better UX (professional apps do this)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('✅ App initialization complete');
        setIsInitialized(true);
        
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setIsInitialized(true); // Still continue to app
      }
    };

    initializeApp();
  }, [dispatch]);

  // Phase 1: App Initialization (Splash Screen)
  if (!isInitialized) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
          options={{ gestureEnabled: false }} // Prevent swipe back
        />
      </Stack.Navigator>
    );
  }

  // Phase 2: Authentication Loading
  if (isLoading) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="Loading" 
          component={SplashScreen} // Or create a separate LoadingScreen
          options={{ gestureEnabled: false }}
        />
      </Stack.Navigator>
    );
  }

  // Phase 3: Authentication Check
  if (!isAuthenticated || !user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ 
            gestureEnabled: false, // Prevent swipe back to splash
            animationTypeForReplace: 'push' // Smooth transition
          }}
        />
      </Stack.Navigator>
    );
  }

  // Phase 4: Authenticated - Role-Based Navigation
  return <RoleBasedNavigator />;
};

export default AuthNavigator;
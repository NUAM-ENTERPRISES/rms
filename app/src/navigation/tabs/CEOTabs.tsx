import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import CEODashboard from '../../screens/roles/CEODashboard';
import InterviewsScreen from '../../screens/shared/InterviewsScreen';
import CandidatesScreen from '../../screens/shared/CandidatesScreen';
import ProfileScreen from '../../screens/shared/ProfileScreen';

// Import stack navigators
import { ProjectsStackNavigator } from '../stacks';

import { COLORS } from '../../constants/colors';

const Tab = createBottomTabNavigator();

const CEOTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName = 'home';
        
        switch (route.name) {
          case 'Dashboard':
            iconName = 'view-dashboard';
            break;
          case 'Projects':
            iconName = 'briefcase';
            break;
          case 'Analytics':
            iconName = 'chart-line';
            break;
          case 'Teams':
            iconName = 'account-group';
            break;
          case 'Settings':
            iconName = 'cog';
            break;
        }
        
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray,
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={CEODashboard} />
    <Tab.Screen name="Projects" component={ProjectsStackNavigator} />
    <Tab.Screen name="Analytics" component={InterviewsScreen} />
    <Tab.Screen name="Teams" component={CandidatesScreen} />
    <Tab.Screen name="Settings" component={ProfileScreen} />
  </Tab.Navigator>
);

export default CEOTabs;
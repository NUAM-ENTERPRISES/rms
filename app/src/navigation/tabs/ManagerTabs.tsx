import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import { ManagerDashboard } from '../../screens/roles/RoleDashboards';
import CandidatesScreen from '../../screens/shared/CandidatesScreen';
import InterviewsScreen from '../../screens/shared/InterviewsScreen';
import ProfileScreen from '../../screens/shared/ProfileScreen';

// Import stack navigators
import { ProjectsStackNavigator } from '../stacks';

import { COLORS } from '../../constants/colors';

const Tab = createBottomTabNavigator();

const ManagerTabs = () => (
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
          case 'Candidates':
            iconName = 'account-multiple';
            break;
          case 'Teams':
            iconName = 'account-group';
            break;
          case 'Profile':
            iconName = 'account';
            break;
        }
        
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray,
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={ManagerDashboard} />
    <Tab.Screen name="Projects" component={ProjectsStackNavigator} />
    <Tab.Screen name="Candidates" component={CandidatesScreen} />
    <Tab.Screen name="Teams" component={InterviewsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default ManagerTabs;
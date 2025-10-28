import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import RecruiterDashboard from '../../screens/roles/RecruiterDashboard';
import CandidatesScreen from '../../screens/shared/CandidatesScreen';
import InterviewsScreen from '../../screens/shared/InterviewsScreen';
import ProfileScreen from '../../screens/shared/ProfileScreen';
import DocumentsScreen from '@/screens/shared/DocumentsScreen';

// Import stack navigators
import { ProjectsStackNavigator } from '../stacks';

import { COLORS } from '../../constants/colors';

const Tab = createBottomTabNavigator();

const RecruiterTabs = () => (
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
          case 'Documentation':
            iconName = 'file-document';
            break;
          case 'Interviews':
            iconName = 'calendar-clock';
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
    <Tab.Screen
      name="Dashboard"
      component={RecruiterDashboard}
      options={{ title: 'My Work' }}
    />
     <Tab.Screen
      name="Projects"
      component={ProjectsStackNavigator}
      options={{ title: 'Projects' }}
    />
    <Tab.Screen
      name="Candidates"
      component={CandidatesScreen}
      options={{ title: 'Candidates' }}
    />
    <Tab.Screen
      name="Documentation"
      component={DocumentsScreen}
      options={{ title: 'Documentation' }}
    />
    <Tab.Screen
      name="Interviews"
      component={InterviewsScreen}
      options={{ title: 'Interviews' }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </Tab.Navigator>
);

export default RecruiterTabs;
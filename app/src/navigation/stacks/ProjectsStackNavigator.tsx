import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProjectsScreen from '../../screens/shared/ProjectsScreen';
import ProjectDetailsScreen from '../../screens/shared/ProjectDetailsScreen';

// Type definitions for the Projects stack
export type ProjectsStackParamList = {
  ProjectsList: undefined;
  ProjectDetails: {
    project: {
      id: string;
      title: string;
      client: string;
      clientType: 'Hospital' | 'Sub-Agency' | 'Healthcare Organization' | 'Individual Referrer';
      description: string;
      priority: 'High' | 'Normal' | 'Low';
      status: 'active' | 'completed' | 'on_hold' | 'cancelled' | 'draft';
      deadline: string;
      startDate: string;
      roles: any[];
      location: string;
      assignedRecruiters: string[];
      totalCandidates: number;
      activeCandidates: number;
      budget?: string;
      manager: string;
      progress: number;
      daysLeft: number;
      team?: string;
      creator?: string;
      projectType?: 'ministry' | 'private';
    };
  };
};

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

const ProjectsStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We'll use custom headers in each screen
      }}
    >
      <Stack.Screen 
        name="ProjectsList" 
        component={ProjectsScreen}
        options={{
          title: 'Projects',
        }}
      />
      <Stack.Screen 
        name="ProjectDetails" 
        component={ProjectDetailsScreen}
        options={{
          title: 'Project Details',
        }}
      />
    </Stack.Navigator>
  );
};

export default ProjectsStackNavigator;
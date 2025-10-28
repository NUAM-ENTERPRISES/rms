import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const ManagerDashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manager Dashboard</Text>
      <Text style={styles.subtitle}>Team and project management</Text>
    </View>
  );
};

const TeamHeadDashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Head Dashboard</Text>
      <Text style={styles.subtitle}>Team leadership and coordination</Text>
    </View>
  );
};

const TeamLeadDashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Lead Dashboard</Text>
      <Text style={styles.subtitle}>Task monitoring and team oversight</Text>
    </View>
  );
};

const DocumentationExecutiveDashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Documentation Executive</Text>
      <Text style={styles.subtitle}>Document verification workflow</Text>
    </View>
  );
};

const ProcessingExecutiveDashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Processing Executive</Text>
      <Text style={styles.subtitle}>Post-selection processing</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
});

export { ManagerDashboard, TeamHeadDashboard, TeamLeadDashboard, DocumentationExecutiveDashboard, ProcessingExecutiveDashboard };
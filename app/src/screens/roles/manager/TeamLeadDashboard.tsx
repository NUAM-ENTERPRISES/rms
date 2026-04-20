import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

const TeamLeadDashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Lead Dashboard</Text>
      <Text style={styles.subtitle}>Task monitoring and team oversight</Text>
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

export default TeamLeadDashboard;

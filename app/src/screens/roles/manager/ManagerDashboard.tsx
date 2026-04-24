import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../../constants/colors';
import StatCard from '../shared/StatCard';
import { useUserProfile } from '../../../hooks/useUserProfile';

const ManagerDashboard: React.FC = () => {
  const { user } = useUserProfile();
  const MOCK_STATS = { 
    totalTeams: 4, 
    activeProjects: 12, 
    pendingApprovals: 8, 
    teamPerformance: '92%' 
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Manager Console</Text>
        <Text style={styles.userName}>{user?.name}</Text>
      </View>
      <View style={styles.statsContainer}>
        <StatCard title="Total Teams" value={MOCK_STATS.totalTeams} icon="account-group" color={COLORS.primary} />
        <StatCard title="Active Projects" value={MOCK_STATS.activeProjects} icon="briefcase" color={COLORS.info} />
        <StatCard title="Pending Appr." value={MOCK_STATS.pendingApprovals} icon="file-check" color={COLORS.warning} />
        <StatCard title="Performance" value={MOCK_STATS.teamPerformance} icon="trending-up" color={COLORS.success} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 50, backgroundColor: COLORS.white },
  welcomeText: { fontSize: 16, color: COLORS.gray },
  userName: { fontSize: 24, fontWeight: 'bold', color: COLORS.dark },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
});

export default ManagerDashboard;

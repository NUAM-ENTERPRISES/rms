import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../../constants/colors';
import StatCard from '../shared/StatCard';
import { useUserProfile } from '../../../hooks/useUserProfile';

const CEODashboard: React.FC = () => {
  const { user } = useUserProfile();
  const MOCK_STATS = { 
    totalRevenue: '₹12.5L', 
    activeRecruiters: 24, 
    monthlySelections: 45, 
    successRate: '88%' 
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Executive Overview</Text>
        <Text style={styles.userName}>{user?.name}</Text>
      </View>
      <View style={styles.statsContainer}>
        <StatCard title="Total Revenue" value={MOCK_STATS.totalRevenue} icon="currency-inr" color={COLORS.success} />
        <StatCard title="Active Recruiters" value={MOCK_STATS.activeRecruiters} icon="account-tie" color={COLORS.primary} />
        <StatCard title="Selections" value={MOCK_STATS.monthlySelections} icon="check-decagram" color={COLORS.info} />
        <StatCard title="Success Rate" value={MOCK_STATS.successRate} icon="chart-line" color={COLORS.warning} />
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

export default CEODashboard;

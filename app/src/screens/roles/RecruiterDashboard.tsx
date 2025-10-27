import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useUserProfile } from '../../hooks/useUserProfile';
import { COLORS } from '../../constants/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Sample data - replace with actual API calls
const MOCK_DATA = {
  assignedCandidates: [
    { id: '1', name: 'John Doe', status: 'documents_pending', project: 'ICU Nurses - UAE' },
    { id: '2', name: 'Jane Smith', status: 'interview_scheduled', project: 'General Nurses - KSA' },
    { id: '3', name: 'Mike Johnson', status: 'approved', project: 'OR Technicians - Qatar' },
  ],
  recentActivities: [
    { id: '1', type: 'candidate_assigned', message: 'New candidate "Sarah Wilson" assigned', time: '2 hours ago' },
    { id: '2', type: 'document_verified', message: 'Documents verified for John Doe', time: '4 hours ago' },
    { id: '3', type: 'interview_completed', message: 'Interview completed for Jane Smith', time: '1 day ago' },
  ],
  todayTasks: [
    { id: '1', task: 'Schedule interview for Mike Johnson', priority: 'high', dueTime: '2:00 PM' },
    { id: '2', task: 'Follow up on document submission - Sarah Wilson', priority: 'medium', dueTime: '4:00 PM' },
    { id: '3', task: 'Update candidate status - John Doe', priority: 'low', dueTime: 'End of day' },
  ],
  stats: {
    totalCandidates: 15,
    pendingDocuments: 5,
    interviewsScheduled: 3,
    approvedCandidates: 7,
  },
};

const RecruiterDashboard: React.FC = () => {
  const { user, hasPermission } = useUserProfile();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  // Check if user has recruiter permissions
  if (!hasPermission('read:candidates')) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="lock" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubText}>You don't have permission to access this screen</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'documents_pending':
        return COLORS.warning;
      case 'interview_scheduled':
        return COLORS.info;
      case 'approved':
        return COLORS.success;
      default:
        return COLORS.gray;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'documents_pending':
        return 'Docs Pending';
      case 'interview_scheduled':
        return 'Interview Scheduled';
      case 'approved':
        return 'Approved';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return COLORS.error;
      case 'medium':
        return COLORS.warning;
      case 'low':
        return COLORS.success;
      default:
        return COLORS.gray;
    }
  };

  const renderStatCard = (title: string, value: number, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <View style={styles.statTextContainer}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        <Icon name={icon} size={32} color={color} />
      </View>
    </View>
  );

  const renderCandidateItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.candidateCard}>
      <View style={styles.candidateHeader}>
        <Text style={styles.candidateName}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.candidateProject}>{item.project}</Text>
    </TouchableOpacity>
  );

  const renderActivityItem = ({ item }: { item: any }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <Icon 
          name={item.type === 'candidate_assigned' ? 'account-plus' : 
                item.type === 'document_verified' ? 'file-check' : 'calendar-check'} 
          size={20} 
          color={COLORS.primary} 
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityMessage}>{item.message}</Text>
        <Text style={styles.activityTime}>{item.time}</Text>
      </View>
    </View>
  );

  const renderTaskItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.taskItem}>
      <View style={styles.taskHeader}>
        <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
        <Text style={styles.taskText} numberOfLines={2}>{item.task}</Text>
      </View>
      <Text style={styles.taskTime}>{item.dueTime}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => Alert.alert('Notifications', 'No new notifications')}
        >
          <Icon name="bell-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {renderStatCard('Total Candidates', MOCK_DATA.stats.totalCandidates, 'account-group', COLORS.primary)}
        {renderStatCard('Pending Docs', MOCK_DATA.stats.pendingDocuments, 'file-clock', COLORS.warning)}
        {renderStatCard('Interviews', MOCK_DATA.stats.interviewsScheduled, 'calendar-clock', COLORS.info)}
        {renderStatCard('Approved', MOCK_DATA.stats.approvedCandidates, 'check-circle', COLORS.success)}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="account-plus" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Add Candidate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="briefcase-plus" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>View Projects</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="calendar-plus" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Schedule Interview</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Tasks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Tasks ({MOCK_DATA.todayTasks.length})</Text>
        <FlatList
          data={MOCK_DATA.todayTasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Assigned Candidates */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Candidates ({MOCK_DATA.assignedCandidates.length})</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={MOCK_DATA.assignedCandidates}
          renderItem={renderCandidateItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Recent Activities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <FlatList
          data={MOCK_DATA.recentActivities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.error,
    marginTop: 16,
  },
  errorSubText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: COLORS.white,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  statTitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 16,
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lighter,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.dark,
    marginTop: 8,
    textAlign: 'center',
  },
  candidateCard: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  candidateName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  candidateProject: {
    fontSize: 14,
    color: COLORS.gray,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lighter,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lighter,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  taskText: {
    fontSize: 14,
    color: COLORS.dark,
    flex: 1,
  },
  taskTime: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 8,
  },
});

export default RecruiterDashboard;
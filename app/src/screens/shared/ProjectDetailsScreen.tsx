import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const statusBarHeight = Platform.select({
  ios: 44,
  android: StatusBar.currentHeight || 24,
});

// Types
interface ProjectRole {
  designation: string;
  quota: number;
  filled: number;
  minExperience: number;
  maxExperience?: number;
  specialization?: string;
  employmentType?: 'contract' | 'permanent';
  contractDurationYears?: number;
  genderRequirement?: 'all' | 'male' | 'female';
  shiftType?: string;
  skills?: string | string[];
  requiredCertifications?: string | string[];
  additionalRequirements?: string;
  notes?: string;
}

interface Project {
  id: string;
  title: string;
  client: string;
  clientType: 'Hospital' | 'Sub-Agency' | 'Healthcare Organization' | 'Individual Referrer';
  description: string;
  priority: 'High' | 'Normal' | 'Low';
  status: 'active' | 'completed' | 'on_hold' | 'cancelled' | 'draft';
  deadline: string;
  startDate: string;
  roles: ProjectRole[];
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
}

type RootStackParamList = {
  ProjectDetails: { project: Project };
  Projects: undefined;
};

type ProjectDetailsRouteProp = RouteProp<RootStackParamList, 'ProjectDetails'>;
type ProjectDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProjectDetails'>;

const ProjectDetailsScreen: React.FC = () => {
  const route = useRoute<ProjectDetailsRouteProp>();
  const navigation = useNavigation<ProjectDetailsNavigationProp>();
  const { project } = route.params;

  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'candidates'>('overview');

  // Helper functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return COLORS.success;
      case 'completed':
        return COLORS.brandGreen;
      case 'on_hold':
        return COLORS.warning;
      case 'cancelled':
        return COLORS.error;
      case 'draft':
        return COLORS.gray;
      default:
        return COLORS.light;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'on_hold':
        return 'On Hold';
      case 'cancelled':
        return 'Cancelled';
      case 'draft':
        return 'Draft';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return COLORS.error;
      case 'Normal':
        return COLORS.info;
      case 'Low':
        return COLORS.gray;
      default:
        return COLORS.light;
    }
  };

  const totalRoles = project.roles.reduce((sum, role) => sum + role.quota, 0);
  const filledRoles = project.roles.reduce((sum, role) => sum + role.filled, 0);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        {/* <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="share-variant" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="bookmark-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View> */}
      </View>
      
      <View style={styles.headerContent}>
        <Text style={styles.projectTitle}>{project.title}</Text>
        <View style={styles.headerBadges}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}>
            <Text style={styles.statusText}>{getStatusText(project.status)}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(project.priority) }]}>
            <Text style={styles.priorityText}>{project.priority}</Text>
          </View>
        </View>
        <Text style={styles.createdDate}>Created {formatDate(project.startDate)}</Text>
      </View>
    </View>
  );

  const renderQuickStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{totalRoles}</Text>
        <Text style={styles.statLabel}>Positions</Text>
        <Icon name="target" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{project.totalCandidates}</Text>
        <Text style={styles.statLabel}>Nominated</Text>
        <Icon name="account-group" size={20} color={COLORS.success} />
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{project.roles.length}</Text>
        <Text style={styles.statLabel}>Roles</Text>
        <Icon name="briefcase" size={20} color={COLORS.warning} />
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{project.daysLeft}</Text>
        <Text style={styles.statLabel}>Days Left</Text>
        <Icon name="calendar-clock" size={20} color={project.daysLeft <= 7 ? COLORS.error : COLORS.info} />
      </View>
    </View>
  );

  const renderTabNavigation = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
        onPress={() => setActiveTab('overview')}
      >
        <Icon name="information" size={isIOS ? 14 : 12} color={activeTab === 'overview' ? COLORS.white : COLORS.gray} />
        <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]} numberOfLines={1}>
          Overview
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'roles' && styles.activeTab]}
        onPress={() => setActiveTab('roles')}
      >
        <Icon name="account-tie" size={isIOS ? 14 : 12} color={activeTab === 'roles' ? COLORS.white : COLORS.gray} />
        <Text style={[styles.tabText, activeTab === 'roles' && styles.activeTabText]} numberOfLines={1}>
          Roles ({project.roles.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'candidates' && styles.activeTab]}
        onPress={() => setActiveTab('candidates')}
      >
        <Icon name="account-multiple" size={isIOS ? 14 : 12} color={activeTab === 'candidates' ? COLORS.white : COLORS.gray} />
        <Text style={[styles.tabText, activeTab === 'candidates' && styles.activeTabText]} numberOfLines={1}>
          Candidates
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Project Details */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="information" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Project Details</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color={COLORS.gray} />
            <Text style={styles.detailLabel}>Deadline:</Text>
            <Text style={styles.detailValue}>{formatDateTime(project.deadline)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="clock" size={16} color={COLORS.gray} />
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>{formatDate(project.startDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="account-group" size={16} color={COLORS.gray} />
            <Text style={styles.detailLabel}>Team:</Text>
            <Text style={styles.detailValue}>{project.team || 'Not assigned'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="map-marker" size={16} color={COLORS.gray} />
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{project.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="account" size={16} color={COLORS.gray} />
            <Text style={styles.detailLabel}>Created By:</Text>
            <Text style={styles.detailValue}>{project.creator || project.manager}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="office-building" size={16} color={COLORS.gray} />
            <Text style={styles.detailLabel}>Project Type:</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {project.projectType === 'ministry' ? 'Ministry/Government' : 'Private Sector'}
              </Text>
            </View>
          </View>
          {project.budget && (
            <View style={styles.detailRow}>
              <Icon name="currency-usd" size={16} color={COLORS.gray} />
              <Text style={styles.detailLabel}>Budget:</Text>
              <Text style={styles.detailValue}>{project.budget}</Text>
            </View>
          )}
        </View>
        
        {project.description && (
          <>
            <View style={styles.divider} />
            <Text style={styles.description}>{project.description}</Text>
          </>
        )}
      </View>

      {/* Client Information */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="office-building" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Client Details</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.clientName}>{project.client}</Text>
          <View style={styles.clientTypeBadge}>
            <Text style={styles.clientTypeText}>{project.clientType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="map-marker" size={14} color={COLORS.gray} />
            <Text style={styles.clientLocation}>San Francisco, CA</Text>
          </View>
        </View>
      </View>

      {/* Progress Overview */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="chart-line" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Progress Overview</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={styles.progressPercent}>{project.progress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${project.progress}%`,
                    backgroundColor: project.progress >= 80 ? COLORS.success : 
                                   project.progress >= 50 ? COLORS.warning : COLORS.error
                  }
                ]} 
              />
            </View>
          </View>
          <View style={styles.progressDetails}>
            <Text style={styles.progressDetailText}>
              {filledRoles} of {totalRoles} positions filled
            </Text>
            <Text style={styles.progressDetailText}>
              {project.activeCandidates} active candidates
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderRolesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Roles Required ({project.roles.length})</Text>
      {project.roles.map((role, index) => (
        <View key={index} style={styles.roleCard}>
          <View style={styles.roleHeader}>
            <Text style={styles.roleTitle}>{role.designation}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role.quota} pos</Text>
            </View>
          </View>
          
          {/* Experience and basic info */}
          <View style={styles.roleInfo}>
            <View style={styles.roleInfoRow}>
              <Icon name="clock" size={14} color={COLORS.gray} />
              <Text style={styles.roleInfoText}>
                {role.minExperience && role.maxExperience 
                  ? `${role.minExperience}-${role.maxExperience} years`
                  : role.minExperience 
                  ? `${role.minExperience}+ years`
                  : 'Experience not specified'}
              </Text>
            </View>
            
            {role.shiftType && (
              <View style={styles.roleInfoRow}>
                <Icon name="schedule" size={14} color={COLORS.gray} />
                <Text style={styles.roleInfoText}>{role.shiftType}</Text>
              </View>
            )}
            
            <View style={styles.roleInfoRow}>
              <Icon name="briefcase" size={14} color={COLORS.gray} />
              <Text style={styles.roleInfoText}>
                {role.employmentType === 'contract' ? 'Contract' : 'Permanent'}
                {role.employmentType === 'contract' && role.contractDurationYears && 
                  ` (${role.contractDurationYears} years)`}
              </Text>
            </View>
            
            <View style={styles.roleInfoRow}>
              <Icon name="human-male-female" size={14} color={COLORS.gray} />
              <Text style={styles.roleInfoText}>
                {role.genderRequirement === 'all' 
                  ? 'All Genders' 
                  : role.genderRequirement === 'female' 
                  ? 'Female Only' 
                  : 'Male Only'}
              </Text>
            </View>
          </View>

          {/* Skills */}
          {role.skills && (
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionTitle}>Skills</Text>
              <Text style={styles.roleSectionText}>
                {typeof role.skills === 'string' 
                  ? role.skills 
                  : Array.isArray(role.skills) 
                  ? role.skills.join(', ') 
                  : 'Not specified'}
              </Text>
            </View>
          )}

          {/* Certifications */}
          {role.requiredCertifications && (
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionTitle}>Required Certifications</Text>
              <Text style={styles.roleSectionText}>
                {typeof role.requiredCertifications === 'string' 
                  ? role.requiredCertifications 
                  : Array.isArray(role.requiredCertifications) 
                  ? role.requiredCertifications.join(', ') 
                  : 'Not specified'}
              </Text>
            </View>
          )}

          {/* Additional Requirements */}
          {role.additionalRequirements && (
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionTitle}>Additional Requirements</Text>
              <Text style={styles.roleSectionText}>{role.additionalRequirements}</Text>
            </View>
          )}

          {/* Notes */}
          {role.notes && (
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionTitle}>Notes</Text>
              <Text style={styles.roleSectionText}>{role.notes}</Text>
            </View>
          )}

          {/* Progress for this role */}
          <View style={styles.roleProgress}>
            <View style={styles.roleProgressHeader}>
              <Text style={styles.roleProgressText}>
                {role.filled}/{role.quota} filled
              </Text>
              <Text style={styles.roleProgressPercent}>
                {role.quota > 0 ? Math.min(Math.round((role.filled / role.quota) * 100), 100) : 0}%
              </Text>
            </View>
            <View style={styles.roleProgressBar}>
              <View 
                style={[
                  styles.roleProgressFill,
                  { 
                    width: `${role.quota > 0 ? Math.min((role.filled / role.quota) * 100, 100) : 0}%`,
                    backgroundColor: role.filled >= role.quota ? COLORS.success : COLORS.primary
                  }
                ]} 
              />
            </View>
            {role.filled > role.quota && (
              <Text style={styles.roleOverflowText}>
                ⚠️ {role.filled - role.quota} over capacity
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderCandidatesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Candidate Overview</Text>
      
      {/* Candidate stats */}
      <View style={styles.candidateStats}>
        <View style={styles.candidateStatCard}>
          <Text style={styles.candidateStatNumber}>{project.totalCandidates}</Text>
          <Text style={styles.candidateStatLabel}>Total Candidates</Text>
        </View>
        <View style={styles.candidateStatCard}>
          <Text style={styles.candidateStatNumber}>{project.activeCandidates}</Text>
          <Text style={styles.candidateStatLabel}>Active</Text>
        </View>
        <View style={styles.candidateStatCard}>
          <Text style={styles.candidateStatNumber}>{filledRoles}</Text>
          <Text style={styles.candidateStatLabel}>Confirmed</Text>
        </View>
      </View>

      {/* Placeholder for candidate list */}
      <View style={styles.candidatePlaceholder}>
        <Icon name="account-search" size={48} color={COLORS.light} />
        <Text style={styles.candidatePlaceholderTitle}>Candidate Information</Text>
        <Text style={styles.candidatePlaceholderText}>
          This section displays candidate information and project assignments. 
          View candidate profiles, nomination status, and project progress details.
        </Text>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'roles':
        return renderRolesTab();
      case 'candidates':
        return renderCandidatesTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} translucent={false} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {renderHeader()}
        {renderQuickStats()}
        {renderTabNavigation()}
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: isIOS ? 0 : statusBarHeight,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: isIOS ? 10 : 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lighter,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  headerContent: {
    gap: 8,
  },
  projectTitle: {
    fontSize: isIOS ? 24 : 22,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 8,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  createdDate: {
    fontSize: 14,
    color: COLORS.gray,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: isIOS ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isIOS ? 10 : 8,
    paddingHorizontal: isIOS ? 6 : 4,
    borderRadius: 8,
    gap: isIOS ? 4 : 3,
    minHeight: isIOS ? 56 : 48,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: isIOS ? 10 : 9,
    fontWeight: '600',
    color: COLORS.gray,
    textAlign: 'center',
    flexShrink: 1,
  },
  activeTabText: {
    color: COLORS.white,
  },
  tabContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  cardContent: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '500',
    flex: 1,
  },
  typeBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lighter,
    marginVertical: 16,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  clientTypeBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  clientTypeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  clientLocation: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: COLORS.lighter,
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressDetails: {
    gap: 4,
  },
  progressDetailText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 16,
  },
  roleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lighter,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    flex: 1,
  },
  roleBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  roleInfo: {
    marginBottom: 12,
    gap: 6,
  },
  roleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleInfoText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  roleSection: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lighter,
  },
  roleSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  roleSectionText: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
  roleProgress: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lighter,
  },
  roleProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleProgressText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  roleProgressPercent: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  roleProgressBar: {
    height: 6,
    backgroundColor: COLORS.lighter,
    borderRadius: 3,
    overflow: 'hidden',
  },
  roleProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  roleOverflowText: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },

  candidateStats: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  candidateStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  candidateStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  candidateStatLabel: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  candidatePlaceholder: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  candidatePlaceholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  candidatePlaceholderText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

});

export default ProjectDetailsScreen;
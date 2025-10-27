import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useGetAllProjectsQuery } from '@/features/project/projectApi';
import { Project as APIProject, QueryProjectsParams } from '@/features/project/projectTypes';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '../../navigation/stacks/ProjectsStackNavigator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// iOS specific padding adjustments
const isIOS = Platform.OS === 'ios';
const statusBarHeight = Platform.select({
  ios: 44,
  android: StatusBar.currentHeight || 24,
});

interface ProjectRole {
  designation: string;
  quota: number;
  filled: number;
  minExperience: number;
  specialization?: string;
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
  progress: number; // 0-100
  daysLeft: number;
}

// Dummy projects data based on healthcare recruitment
const dummyProjects: Project[] = [
  {
    id: '1',
    title: 'ICU Nursing Staff Expansion',
    client: 'Emirates Hospital',
    clientType: 'Hospital',
    description: 'Urgent requirement for experienced ICU nurses for new cardiac wing expansion',
    priority: 'High',
    status: 'active',
    deadline: '2024-02-15',
    startDate: '2024-01-01',
    roles: [
      { designation: 'ICU Nurse', quota: 12, filled: 7, minExperience: 3 },
      { designation: 'Senior ICU Nurse', quota: 4, filled: 2, minExperience: 5 },
      { designation: 'Charge Nurse', quota: 2, filled: 1, minExperience: 7 }
    ],
    location: 'Dubai, UAE',
    assignedRecruiters: ['Sarah Ahmed', 'John Miller'],
    totalCandidates: 45,
    activeCandidates: 28,
    budget: 'AED 150,000',
    manager: 'Dr. Ahmed Hassan',
    progress: 65,
    daysLeft: 12,
  },
  {
    id: '2',
    title: 'Operation Theater Team',
    client: 'Cleveland Clinic Abu Dhabi',
    clientType: 'Healthcare Organization',
    description: 'Comprehensive staffing for new surgical department with latest technology',
    priority: 'High',
    status: 'active',
    deadline: '2024-03-01',
    startDate: '2024-01-10',
    roles: [
      { designation: 'Theater Nurse', quota: 8, filled: 5, minExperience: 4, specialization: 'Cardiac Surgery' },
      { designation: 'Anesthesia Technician', quota: 4, filled: 2, minExperience: 3 },
      { designation: 'Surgical Technologist', quota: 6, filled: 3, minExperience: 2 }
    ],
    location: 'Abu Dhabi, UAE',
    assignedRecruiters: ['Maria Santos', 'Ahmed Al-Rashid'],
    totalCandidates: 52,
    activeCandidates: 31,
    budget: 'AED 200,000',
    manager: 'Dr. Sarah Johnson',
    progress: 55,
    daysLeft: 25,
  },
  {
    id: '3',
    title: 'Emergency Department Staffing',
    client: 'Al Qassimi Hospital',
    clientType: 'Hospital',
    description: 'Emergency department expansion requiring experienced emergency care professionals',
    priority: 'Normal',
    status: 'active',
    deadline: '2024-02-28',
    startDate: '2024-01-05',
    roles: [
      { designation: 'Emergency Nurse', quota: 10, filled: 8, minExperience: 2 },
      { designation: 'Emergency Medicine Doctor', quota: 3, filled: 1, minExperience: 5 },
      { designation: 'Trauma Nurse', quota: 6, filled: 4, minExperience: 4 }
    ],
    location: 'Sharjah, UAE',
    assignedRecruiters: ['Priya Sharma'],
    totalCandidates: 38,
    activeCandidates: 22,
    budget: 'AED 180,000',
    manager: 'Dr. Mohammed Ali',
    progress: 75,
    daysLeft: 18,
  },
  {
    id: '4',
    title: 'Pediatric Care Unit',
    client: 'Al Jalila Children\'s Hospital',
    clientType: 'Healthcare Organization',
    description: 'Specialized pediatric nursing staff for children\'s hospital expansion',
    priority: 'Normal',
    status: 'active',
    deadline: '2024-03-15',
    startDate: '2024-01-20',
    roles: [
      { designation: 'Pediatric Nurse', quota: 15, filled: 9, minExperience: 3, specialization: 'Pediatric Care' },
      { designation: 'NICU Nurse', quota: 8, filled: 5, minExperience: 4, specialization: 'Neonatal Care' },
      { designation: 'Pediatric ICU Nurse', quota: 6, filled: 2, minExperience: 5 }
    ],
    location: 'Dubai, UAE',
    assignedRecruiters: ['Lisa Chen', 'Omar Hassan'],
    totalCandidates: 67,
    activeCandidates: 42,
    budget: 'AED 220,000',
    manager: 'Dr. Fatima Al-Zahra',
    progress: 45,
    daysLeft: 32,
  },
  {
    id: '5',
    title: 'Dialysis Center Staffing',
    client: 'NMC Healthcare',
    clientType: 'Healthcare Organization',
    description: 'Complete staffing solution for new dialysis center across multiple locations',
    priority: 'Low',
    status: 'completed',
    deadline: '2024-01-30',
    startDate: '2023-12-01',
    roles: [
      { designation: 'Dialysis Nurse', quota: 12, filled: 12, minExperience: 2, specialization: 'Nephrology' },
      { designation: 'Dialysis Technician', quota: 8, filled: 8, minExperience: 1 },
      { designation: 'Nephrologist', quota: 2, filled: 2, minExperience: 8 }
    ],
    location: 'Dubai, Abu Dhabi',
    assignedRecruiters: ['James Wilson', 'Aisha Mohamed'],
    totalCandidates: 89,
    activeCandidates: 0,
    budget: 'AED 160,000',
    manager: 'Dr. Rajesh Kumar',
    progress: 100,
    daysLeft: 0,
  },
  {
    id: '6',
    title: 'Mental Health Department',
    client: 'American Hospital Dubai',
    clientType: 'Hospital',
    description: 'Establishing comprehensive mental health services with specialized staff',
    priority: 'Low',
    status: 'draft',
    deadline: '2024-04-01',
    startDate: '2024-02-01',
    roles: [
      { designation: 'Psychiatric Nurse', quota: 6, filled: 0, minExperience: 4, specialization: 'Mental Health' },
      { designation: 'Clinical Psychologist', quota: 4, filled: 0, minExperience: 6 },
      { designation: 'Psychiatrist', quota: 2, filled: 0, minExperience: 10 }
    ],
    location: 'Dubai, UAE',
    assignedRecruiters: ['Michael Brown'],
    totalCandidates: 0,
    activeCandidates: 0,
    budget: 'AED 250,000',
    manager: 'Dr. Elena Rodriguez',
    progress: 0,
    daysLeft: 45,
  },
];

// Dummy data for dropdowns
const dummyClients = [
  { id: '', label: 'All Clients' },
  { id: 'client-1', label: 'Emirates Hospital' },
  { id: 'client-2', label: 'Cleveland Clinic Abu Dhabi' },
];

const dummyTeams = [
  { id: '', label: 'All Teams' },
  { id: 'team-1', label: 'ICU Recruitment Team' },
  { id: 'team-2', label: 'Emergency Care Team' },
];

type ProjectsScreenNavigationProp = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectsList'>;

const ProjectsScreen: React.FC = () => {
  const navigation = useNavigation<ProjectsScreenNavigationProp>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filter states
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'deadline' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // API query parameters
  const [queryParams, setQueryParams] = useState<QueryProjectsParams>({
    page: 1,
    limit: 12,
    sortOrder: 'desc',
    sortBy: 'createdAt',
  });

  // RTK Query API call
  const { data: apiResponse, isLoading, error, refetch } = useGetAllProjectsQuery({
    ...queryParams,
    search: searchQuery || undefined,
    status: selectedFilter === 'all' ? undefined : (selectedFilter as 'active' | 'completed' | 'cancelled'),
    clientId: selectedClient || undefined,
    teamId: selectedTeam || undefined,
    sortBy,
    sortOrder,
  });

  // Convert API projects to local Project format
  const convertApiProject = (apiProject: APIProject): Project => {
    const totalRoles = apiProject.rolesNeeded.reduce((sum, role) => sum + role.quantity, 0);
    const filledRoles = apiProject.candidateProjects.length; // Approximate filled roles
    
    return {
      id: apiProject.id,
      title: apiProject.title,
      client: apiProject.client.name,
      clientType: apiProject.client.type as any,
      description: apiProject.description,
      priority: apiProject.priority as any,
      status: apiProject.status as any,
      deadline: apiProject.deadline,
      startDate: apiProject.createdAt,
      roles: apiProject.rolesNeeded.map(role => ({
        designation: role.designation,
        quota: role.quantity,
        filled: apiProject.candidateProjects.filter(cp => cp.roleNeededId === role.id).length,
        minExperience: role.minExperience,
        specialization: role.skills.join(', '),
      })),
      location: apiProject.countryCode, // Use country code as location
      assignedRecruiters: [], // Not available in API, use empty array
      totalCandidates: apiProject.candidateProjects.length,
      activeCandidates: apiProject.candidateProjects.filter(cp => cp.status === 'nominated').length,
      budget: '', // Not available in API
      manager: apiProject.creator.name,
      progress: totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0,
      daysLeft: Math.max(0, Math.ceil((new Date(apiProject.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    };
  };

  // Use API projects or fallback to dummy data
  const apiProjects = apiResponse?.data?.projects?.map(convertApiProject) || [];
  const projects = apiProjects.length > 0 ? apiProjects : dummyProjects;

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

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return COLORS.success;
    if (progress >= 50) return COLORS.warning;
    return COLORS.error;
  };

  // Handle search with debouncing
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Update query params to trigger API refetch
    setQueryParams(prev => ({
      ...prev,
      page: 1, // Reset to first page when searching
    }));
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    // Update query params to trigger API refetch
    setQueryParams(prev => ({
      ...prev,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handleSortChange = (newSortBy: 'title' | 'deadline' | 'createdAt', newSortOrder?: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    if (newSortOrder) {
      setSortOrder(newSortOrder);
    }
    setQueryParams(prev => ({
      ...prev,
      page: 1,
    }));
  };

  const handleAdvancedFilterChange = (clientId?: string, teamId?: string) => {
    if (clientId !== undefined) setSelectedClient(clientId);
    if (teamId !== undefined) setSelectedTeam(teamId);
    setQueryParams(prev => ({
      ...prev,
      page: 1,
    }));
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
    setSelectedClient('');
    setSelectedTeam('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setQueryParams({
      page: 1,
      limit: 12,
      sortOrder: 'desc',
      sortBy: 'createdAt',
    });
  };

  // For API projects, we don't need local filtering since API handles it
  // For dummy data fallback, we still use local filtering
  const filteredProjects = apiProjects.length > 0 ? projects : projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.roles.some((role: any) => role.designation.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' || project.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const handleProjectPress = (project: Project) => {
    const totalRoles = project.roles.reduce((sum, role) => sum + role.quota, 0);
    const filledRoles = project.roles.reduce((sum, role) => sum + role.filled, 0);
    
    Alert.alert(
      project.title,
      `Client: ${project.client}\nStatus: ${getStatusText(project.status)}\nProgress: ${project.progress}%\nRoles: ${filledRoles}/${totalRoles} filled\nDeadline: ${project.deadline}`,
      [
        { text: 'View Details', onPress: () => navigateToProjectDetails(project) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const navigateToProjectDetails = (project: Project) => {
    navigation.navigate('ProjectDetails', { project });
  };

  const renderProgressBar = (progress: number) => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <View 
          style={[
            styles.progressBarFill, 
            { 
              width: `${progress}%`, 
              backgroundColor: getProgressColor(progress) 
            }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>{progress}%</Text>
    </View>
  );

  const renderProjectCard = ({ item }: { item: Project }) => {
    const totalRoles = item.roles.reduce((sum, role) => sum + role.quota, 0);
    const filledRoles = item.roles.reduce((sum, role) => sum + role.filled, 0);
    
    return (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() => handleProjectPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.projectInfo}>
            <Text style={styles.projectTitle}>{item.title}</Text>
            <Text style={styles.clientName}>{item.client}</Text>
            <Text style={styles.clientType}>{item.clientType}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Icon name="map-marker" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="calendar" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>Deadline: {item.deadline}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="account-group" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>Roles: {filledRoles}/{totalRoles} filled</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="account-multiple" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>{item.activeCandidates} active candidates</Text>
          </View>
          {item.budget && (
            <View style={styles.detailRow}>
              <Icon name="currency-usd" size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>Budget: {item.budget}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardProgress}>
          <Text style={styles.progressLabel}>Project Progress</Text>
          {renderProgressBar(item.progress)}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.rolesContainer}>
            {item.roles.slice(0, 2).map((role, index) => (
              <View key={index} style={styles.roleChip}>
                <Text style={styles.roleText}>{role.designation}</Text>
              </View>
            ))}
            {item.roles.length > 2 && (
              <Text style={styles.moreRoles}>+{item.roles.length - 2} more</Text>
            )}
          </View>
          <View style={styles.timeContainer}>
            {item.daysLeft > 0 ? (
              <>
                <Icon name="clock" size={12} color={item.daysLeft <= 7 ? COLORS.error : COLORS.gray} />
                <Text style={[
                  styles.daysLeftText,
                  { color: item.daysLeft <= 7 ? COLORS.error : COLORS.gray }
                ]}>
                  {item.daysLeft} days left
                </Text>
              </>
            ) : item.status === 'completed' ? (
              <>
                <Icon name="check-circle" size={12} color={COLORS.success} />
                <Text style={[styles.daysLeftText, { color: COLORS.success }]}>
                  Completed
                </Text>
              </>
            ) : (
              <>
                <Icon name="alert-circle" size={12} color={COLORS.error} />
                <Text style={[styles.daysLeftText, { color: COLORS.error }]}>
                  Overdue
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filterOptions = [
    { key: 'all', label: 'All', count: projects.length },
    { key: 'active', label: 'Active', count: projects.filter(p => p.status === 'active').length },
    { key: 'completed', label: 'Completed', count: projects.filter(p => p.status === 'completed').length },
    { key: 'cancelled', label: 'Cancelled', count: projects.filter(p => p.status === 'cancelled').length },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={COLORS.background}
        translucent={false}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        <Text style={styles.subtitle}>{filteredProjects.length} total projects</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects, clients, roles..."
          placeholderTextColor={COLORS.light}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === item.key && styles.activeFilterTab
              ]}
              onPress={() => handleFilterChange(item.key)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === item.key && styles.activeFilterTabText
              ]}>
                {item.label} ({item.count})
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Advanced Filters Toggle */}
      <View style={styles.advancedFilterToggle}>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Text style={styles.toggleButtonText}>Advanced Filters</Text>
          <Icon 
            name={showAdvancedFilters ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
          <Text style={styles.clearFiltersText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <View style={styles.advancedFiltersPanel}>
          <View style={styles.filtersContainer}>
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Client:</Text>
              <View style={styles.dropdownWrapper}>
                <View style={styles.dropdownContainer}>
                  {dummyClients.map((client, index) => (
                    <TouchableOpacity
                      key={client.id}
                      style={[
                        styles.dropdownOption,
                        selectedClient === client.id && styles.selectedDropdownOption,
                        index === dummyClients.length - 1 && styles.lastDropdownOption
                      ]}
                      onPress={() => handleAdvancedFilterChange(client.id, undefined)}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        selectedClient === client.id && styles.selectedDropdownOptionText
                      ]}>
                        {client.label}
                      </Text>
                      {selectedClient === client.id && (
                        <Icon name="check" size={16} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            <View style={styles.filterColumnSpacer} />
            
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Team:</Text>
              <View style={styles.dropdownWrapper}>
                <View style={styles.dropdownContainer}>
                  {dummyTeams.map((team, index) => (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.dropdownOption,
                        selectedTeam === team.id && styles.selectedDropdownOption,
                        index === dummyTeams.length - 1 && styles.lastDropdownOption
                      ]}
                      onPress={() => handleAdvancedFilterChange(undefined, team.id)}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        selectedTeam === team.id && styles.selectedDropdownOptionText
                      ]}>
                        {team.label}
                      </Text>
                      {selectedTeam === team.id && (
                        <Icon name="check" size={16} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Projects List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={COLORS.error} />
          <Text style={styles.errorTitle}>Failed to load projects</Text>
          <Text style={styles.errorSubtitle}>Please check your connection and try again</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          renderItem={renderProjectCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="folder-search" size={64} color={COLORS.light} />
              <Text style={styles.emptyTitle}>No projects found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search criteria' : 'No projects match the selected filter'}
              </Text>
            </View>
          }
          ListFooterComponent={
            apiProjects.length > 0 && apiResponse?.data?.pagination ? (
              <View style={styles.paginationContainer}>
                <Text style={styles.paginationText}>
                  Page {apiResponse.data.pagination.page} of {apiResponse.data.pagination.totalPages}
                  {' '}({apiResponse.data.pagination.total} total projects)
                </Text>
                <View style={styles.paginationButtons}>
                  <TouchableOpacity 
                    style={[styles.paginationButton, queryParams.page === 1 && styles.disabledButton]}
                    onPress={() => setQueryParams(prev => ({ ...prev, page: Math.max(1, prev.page! - 1) }))}
                    disabled={queryParams.page === 1}
                  >
                    <Text style={[styles.paginationButtonText, queryParams.page === 1 && styles.disabledButtonText]}>
                      Previous
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.paginationButton, queryParams.page === apiResponse.data.pagination.totalPages && styles.disabledButton]}
                    onPress={() => setQueryParams(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                    disabled={queryParams.page === apiResponse.data.pagination.totalPages}
                  >
                    <Text style={[styles.paginationButtonText, queryParams.page === apiResponse.data.pagination.totalPages && styles.disabledButtonText]}>
                      Next
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => Alert.alert('Create Project', 'Project creation feature will be available soon')}
      >
        <Icon name="plus" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: isIOS ? 0 : statusBarHeight,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: isIOS ? 20 : 16,
    paddingTop: isIOS ? 10 : 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lighter,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: isIOS ? 14 : 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lighter,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: isIOS ? 0.1 : 0,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
    paddingVertical: isIOS ? 0 : 4,
  },
  filterWrapper: {
    marginBottom: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 50,
  },
  filterTab: {
    paddingHorizontal: isIOS ? 18 : 16,
    paddingVertical: isIOS ? 10 : 8,
    marginRight: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lighter,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: isIOS ? 0.05 : 0,
    shadowRadius: 1,
    elevation: 1,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowOpacity: isIOS ? 0.15 : 0,
    shadowRadius: 3,
    elevation: 3,
  },
  filterTabText: {
    fontSize: isIOS ? 13 : 12,
    color: COLORS.gray,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeFilterTabText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: isIOS ? 100 : 80,
  },
  projectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: isIOS ? 18 : 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: isIOS ? 3 : 2,
    },
    shadowOpacity: isIOS ? 0.12 : 0.1,
    shadowRadius: isIOS ? 6 : 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectInfo: {
    flex: 1,
    paddingRight: 12,
  },
  projectTitle: {
    fontSize: isIOS ? 17 : 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  clientName: {
    fontSize: isIOS ? 15 : 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientType: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: isIOS ? 10 : 8,
    paddingVertical: isIOS ? 6 : 4,
    borderRadius: 12,
    marginBottom: 4,
    minWidth: isIOS ? 60 : 55,
    alignItems: 'center',
  },
  statusText: {
    fontSize: isIOS ? 11 : 10,
    color: COLORS.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  priorityBadge: {
    paddingHorizontal: isIOS ? 10 : 8,
    paddingVertical: isIOS ? 4 : 3,
    borderRadius: 8,
    minWidth: isIOS ? 50 : 45,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: isIOS ? 10 : 9,
    color: COLORS.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardBody: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isIOS ? 8 : 6,
    paddingVertical: 2,
  },
  detailText: {
    fontSize: isIOS ? 13 : 12,
    color: COLORS.gray,
    marginLeft: 8,
    flex: 1,
  },
  cardProgress: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.lighter,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
    marginBottom: 6,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.lighter,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
    minWidth: 30,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.lighter,
  },
  rolesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  roleChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: isIOS ? 10 : 8,
    paddingVertical: isIOS ? 5 : 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 2,
  },
  roleText: {
    fontSize: isIOS ? 11 : 10,
    color: COLORS.primary,
    fontWeight: '500',
  },
  moreRoles: {
    fontSize: isIOS ? 11 : 10,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  daysLeftText: {
    fontSize: isIOS ? 12 : 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.light,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: isIOS ? 40 : 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: isIOS ? 6 : 4,
    },
    shadowOpacity: isIOS ? 0.25 : 0.3,
    shadowRadius: isIOS ? 10 : 8,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  paginationContainer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.lighter,
    backgroundColor: COLORS.white,
  },
  paginationText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.light,
  },
  paginationButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: COLORS.gray,
  },
  // Advanced Filter Styles
  advancedFilterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 8,
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.error,
    borderRadius: 6,
  },
  clearFiltersText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  advancedFiltersPanel: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: isIOS ? 18 : 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lighter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  filterColumn: {
    flex: 1,
    minWidth: 0, // Prevents overflow on smaller screens
  },
  filterColumnSpacer: {
    width: isIOS ? 16 : 12,
  },
  filterLabel: {
    fontSize: isIOS ? 13 : 12,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: isIOS ? 8 : 6,
    paddingHorizontal: 2,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: COLORS.lighter,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
    backgroundColor: COLORS.background,
  },
  dropdownWrapper: {
    marginTop: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: COLORS.lighter,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    maxHeight: isIOS ? 130 : 120,
    minHeight: isIOS ? 100 : 90,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isIOS ? 14 : 12,
    paddingVertical: isIOS ? 12 : 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.lighter,
    minHeight: isIOS ? 44 : 40,
  },
  lastDropdownOption: {
    borderBottomWidth: 0,
  },
  selectedDropdownOption: {
    backgroundColor: COLORS.primaryLight,
  },
  dropdownOptionText: {
    fontSize: isIOS ? 15 : 14,
    color: COLORS.dark,
    flex: 1,
    lineHeight: isIOS ? 20 : 18,
  },
  selectedDropdownOptionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default ProjectsScreen;
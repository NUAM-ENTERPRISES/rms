import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
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
import { useGetAllCandidatesQuery } from '../../features/candidate/candidateApi';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { 
  setSearchQuery, 
  setStatusFilter, 
  nextPage, 
  previousPage,
  resetFilters 
} from '../../features/candidate/candidateSlice';
import type { Candidate, CandidateStatus } from '../../features/candidate/candidateType';

// Platform-specific adjustments
const isIOS = Platform.OS === 'ios';

const CandidatesScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Local state as fallback while Redux candidate module loads
  const [localFilters, setLocalFilters] = useState({ 
    page: 1, 
    limit: 12, 
    sortBy: 'createdAt' as const, 
    sortOrder: 'desc' as const,
    search: '',
    currentStatus: undefined as CandidateStatus | undefined
  });

  // Try to get candidate state from Redux, fallback to local state
  const candidateState = useAppSelector((state) => state?.candidate);
  
  const filters = candidateState?.filters || localFilters;
  const loading = candidateState?.loading || false;
  
  // Run API query with current filters
  const { 
    data: candidatesResponse, 
    isLoading: isApiLoading, 
    error: apiError 
  } = useGetAllCandidatesQuery(filters);

  console.log("🔍 CandidatesScreen response:", candidatesResponse);

  const candidates = candidatesResponse?.data?.candidates || [];
  const totalCandidates = candidatesResponse?.data?.pagination?.total || 0;

  // Show error alert if API call fails
  useEffect(() => {
    if (apiError) {
      Alert.alert(
        'Error Loading Candidates',
        'Failed to load candidates. Please try again.',
        [
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  }, [apiError]);

  const getStatusColor = (status: CandidateStatus) => {
    switch (status) {
      case 'new':
        return COLORS.primary;
      case 'shortlisted':
        return COLORS.warning;
      case 'selected':
        return COLORS.success;
      case 'rejected':
        return COLORS.error;
      case 'hired':
        return COLORS.success;
      default:
        return COLORS.gray;
    }
  };

  const getStatusText = (status: CandidateStatus) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'shortlisted':
        return 'Shortlisted';
      case 'selected':
        return 'Selected';
      case 'rejected':
        return 'Rejected';
      case 'hired':
        return 'Hired';
      default:
        return status;
    }
  };

  // Handle search input changes
  const handleSearchChange = (text: string) => {
    if (candidateState) {
      dispatch(setSearchQuery(text));
    } else {
      setLocalFilters(prev => ({ ...prev, search: text, page: 1 }));
    }
  };

  // Handle status filter changes  
  const handleStatusFilter = (status: string) => {
    const newStatus = status === 'all' ? undefined : (status as CandidateStatus);
    
    if (candidateState) {
      dispatch(setStatusFilter(newStatus));
    } else {
      setLocalFilters(prev => ({ ...prev, currentStatus: newStatus, page: 1 }));
    }
  };

  const handleCandidatePress = (candidate: Candidate) => {
    const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'No Name';
    const phoneNumber = candidate.countryCode && candidate.mobileNumber 
      ? `${candidate.countryCode} ${candidate.mobileNumber}` 
      : candidate.mobileNumber || 'No phone';
    
    Alert.alert(
      fullName,
      `Email: ${candidate.email}\nPhone: ${phoneNumber}\nStatus: ${getStatusText(candidate.currentStatus)}\nSource: ${candidate.source}\nLast Updated: ${formatDate(candidate.updatedAt)}${candidate.expectedSalary ? `\nExpected Salary: $${candidate.expectedSalary}` : ''}`,
      [
        { text: 'View Details', onPress: () => console.log('View Details') },
        { text: 'Edit', onPress: () => console.log('Edit') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };



  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const renderCandidateCard = ({ item }: { item: Candidate }) => {
    const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'No Name';
    const phoneNumber = item.countryCode && item.mobileNumber 
      ? `${item.countryCode} ${item.mobileNumber}` 
      : item.mobileNumber || 'No phone';
    
    return (
      <TouchableOpacity
        style={styles.candidateCard}
        onPress={() => handleCandidatePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            {item.profileImage ? (
              <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
            ) : (
              <Icon name="account" size={24} color={COLORS.primary} />
            )}
          </View>
          <View style={styles.candidateInfo}>
            <Text style={styles.candidateName} numberOfLines={1}>{fullName}</Text>
            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <Icon name="email-outline" size={12} color={COLORS.gray} />
                <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
              </View>
              <View style={styles.contactRow}>
                <Icon name="phone-outline" size={12} color={COLORS.gray} />
                <Text style={styles.contactText} numberOfLines={1}>{phoneNumber}</Text>
              </View>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.currentStatus) }]}>
              <Text style={styles.statusText}>{getStatusText(item.currentStatus)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Icon name="clock-outline" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>Updated {formatDate(item.updatedAt)}</Text>
          </View>
          {(item.totalExperience || item.experience) && (
            <View style={styles.detailRow}>
              <Icon name="briefcase-outline" size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>{item.totalExperience || item.experience} years experience</Text>
            </View>
          )}
          {item.currentEmployer && (
            <View style={styles.detailRow}>
              <Icon name="office-building" size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>{item.currentEmployer}</Text>
            </View>
          )}
          {item.source && (
            <View style={styles.detailRow}>
              <Icon name="source-branch" size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>Source: {item.source}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.skillsContainer}>
            {item.skills && item.skills.length > 0 ? (
              <>
                {item.skills.slice(0, 2).map((skill, index) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
                {item.skills.length > 2 && (
                  <Text style={styles.moreSkills}>+{item.skills.length - 2} more</Text>
                )}
              </>
            ) : (
              <Text style={styles.noSkills}>No skills listed</Text>
            )}
          </View>
          {item.expectedSalary && (
            <View style={styles.salaryContainer}>
              <Icon name="currency-usd" size={12} color={COLORS.success} />
              <Text style={styles.salaryText}>${item.expectedSalary}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filterOptions = [
    { key: 'all', label: 'All', count: totalCandidates },
    { key: 'new', label: 'New', count: candidates.filter(c => c.currentStatus === 'new').length },
    { key: 'shortlisted', label: 'Shortlisted', count: candidates.filter(c => c.currentStatus === 'shortlisted').length },
    { key: 'selected', label: 'Selected', count: candidates.filter(c => c.currentStatus === 'selected').length },
    { key: 'hired', label: 'Hired', count: candidates.filter(c => c.currentStatus === 'hired').length },
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
        <Text style={styles.title}>Candidates</Text>
        <Text style={styles.subtitle}>{candidates.length} of {totalCandidates} candidates</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search candidates..."
          placeholderTextColor={COLORS.light}
          value={filters.search || ''}
          onChangeText={handleSearchChange}
        />
        {(filters.search || '').length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
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
                (!filters.currentStatus && item.key === 'all') || filters.currentStatus === item.key ? styles.activeFilterTab : null
              ]}
              onPress={() => handleStatusFilter(item.key)}
            >
              <Text style={[
                styles.filterTabText,
                (!filters.currentStatus && item.key === 'all') || filters.currentStatus === item.key ? styles.activeFilterTabText : null
              ]}>
                {item.label} ({item.count})
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Loading or Candidates List */}
      {(isApiLoading || loading) ? (
        <View style={[styles.emptyContainer, { paddingVertical: 100 }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyTitle}>Loading candidates...</Text>
        </View>
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          renderItem={renderCandidateCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="account-search" size={64} color={COLORS.light} />
              <Text style={styles.emptyTitle}>No candidates found</Text>
              <Text style={styles.emptySubtitle}>
                {filters.search ? 'Try adjusting your search criteria' : 'No candidates match the selected filter'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => Alert.alert('Add Candidate', 'This would open the add candidate form')}
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
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    paddingVertical: isIOS ? 12 : 10,
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
    elevation: isIOS ? 0 : 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
    paddingVertical: 0,
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
    paddingHorizontal: 16,
    paddingVertical: isIOS ? 8 : 6,
    marginRight: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lighter,
    minHeight: isIOS ? 36 : 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: isIOS ? 0.05 : 0,
    shadowRadius: 1,
    elevation: isIOS ? 0 : 1,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowOpacity: isIOS ? 0.15 : 0,
    shadowRadius: 3,
    elevation: isIOS ? 0 : 3,
  },
  filterTabText: {
    fontSize: 12,
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
    paddingBottom: 100,
  },
  candidateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: isIOS ? 0.12 : 0,
    shadowRadius: isIOS ? 6 : 0,
    elevation: isIOS ? 0 : 3,
    borderWidth: isIOS ? 0 : 0.5,
    borderColor: isIOS ? 'transparent' : COLORS.lighter,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: COLORS.lighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  candidateInfo: {
    flex: 1,
    paddingRight: 8,
  },
  candidateName: {
    fontSize: isIOS ? 17 : 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  contactInfo: {
    gap: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactText: {
    fontSize: isIOS ? 13 : 12,
    color: COLORS.gray,
    marginLeft: 6,
    flex: 1,
  },
  designation: {
    fontSize: isIOS ? 15 : 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  project: {
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
    minWidth: isIOS ? 60 : 55,
    alignItems: 'center',
  },
  statusText: {
    fontSize: isIOS ? 11 : 10,
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.lighter,
  },
  skillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  skillChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: isIOS ? 10 : 8,
    paddingVertical: isIOS ? 5 : 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 2,
  },
  skillText: {
    fontSize: isIOS ? 11 : 10,
    color: COLORS.primary,
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: isIOS ? 11 : 10,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  noSkills: {
    fontSize: isIOS ? 11 : 10,
    color: COLORS.light,
    fontStyle: 'italic',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    fontSize: isIOS ? 13 : 12,
    color: COLORS.gray,
    fontWeight: '500',
    minWidth: 25,
  },
  salaryText: {
    fontSize: isIOS ? 12 : 11,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 2,
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
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: isIOS ? 0.25 : 0.3,
    shadowRadius: isIOS ? 10 : 8,
    elevation: 8,
  },
});

export default CandidatesScreen;
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
  SafeAreaView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// iOS specific padding adjustments
const isIOS = Platform.OS === 'ios';
const statusBarHeight = Platform.select({
  ios: 44,
  android: StatusBar.currentHeight || 24,
});

interface Interview {
  id: string;
  candidateName: string;
  candidateId: string;
  candidatePhoto: string;
  designation: string;
  project: string;
  client: string;
  interviewDate: string;
  interviewTime: string;
  duration: number; // in minutes
  type: 'online' | 'offline';
  mode: 'panel' | 'one_on_one';
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  interviewer: string;
  panelMembers?: string[];
  meetingLink?: string;
  location?: string;
  notes?: string;
  result?: 'passed' | 'failed' | 'pending';
  score?: number;
  feedback?: string;
  createdBy: string;
  timezone: string;
  reminderSent: boolean;
  candidateConfirmed: boolean;
}

// Dummy interviews data
const dummyInterviews: Interview[] = [
  {
    id: '1',
    candidateName: 'Sarah Johnson',
    candidateId: 'CND001',
    candidatePhoto: 'https://i.pravatar.cc/150?u=sarah',
    designation: 'ICU Nurse',
    project: 'Emirates Hospital ICU Expansion',
    client: 'Emirates Hospital',
    interviewDate: '2025-10-25',
    interviewTime: '10:00',
    duration: 45,
    type: 'online',
    mode: 'panel',
    status: 'scheduled',
    interviewer: 'Dr. Ahmed Hassan',
    panelMembers: ['Dr. Ahmed Hassan', 'Nurse Manager Sarah', 'HR Director John'],
    meetingLink: 'https://zoom.us/j/123456789',
    notes: 'Technical assessment focused on ICU protocols and emergency procedures.',
    createdBy: 'Recruiter Maria',
    timezone: 'UAE/Dubai',
    reminderSent: true,
    candidateConfirmed: true,
  },
  {
    id: '2',
    candidateName: 'Michael Chen',
    candidateId: 'CND002',
    candidatePhoto: 'https://i.pravatar.cc/150?u=michael',
    designation: 'Theater Nurse',
    project: 'Cleveland Clinic Surgery Department',
    client: 'Cleveland Clinic Abu Dhabi',
    interviewDate: '2025-10-22',
    interviewTime: '14:30',
    duration: 60,
    type: 'offline',
    mode: 'one_on_one',
    status: 'completed',
    interviewer: 'Dr. Fatima Al-Zahra',
    location: 'Cleveland Clinic Abu Dhabi, Conference Room A',
    notes: 'Surgical skills assessment and experience discussion.',
    result: 'passed',
    score: 8.5,
    feedback: 'Excellent technical knowledge and communication skills. Recommended for hiring.',
    createdBy: 'Recruiter Ahmed',
    timezone: 'UAE/Dubai',
    reminderSent: true,
    candidateConfirmed: true,
  },
  {
    id: '3',
    candidateName: 'Priya Sharma',
    candidateId: 'CND003',
    candidatePhoto: 'https://i.pravatar.cc/150?u=priya',
    designation: 'Emergency Nurse',
    project: 'Al Qassimi Emergency Department',
    client: 'Al Qassimi Hospital',
    interviewDate: '2025-10-23',
    interviewTime: '09:15',
    duration: 30,
    type: 'online',
    mode: 'one_on_one',
    status: 'ongoing',
    interviewer: 'Dr. Omar Hassan',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/19%3a...',
    notes: 'Emergency protocols and stress management evaluation.',
    createdBy: 'Recruiter Lisa',
    timezone: 'UAE/Dubai',
    reminderSent: true,
    candidateConfirmed: true,
  },
  {
    id: '4',
    candidateName: 'Ahmed Al-Rashid',
    candidateId: 'CND004',
    candidatePhoto: 'https://i.pravatar.cc/150?u=ahmed',
    designation: 'Dialysis Technician',
    project: 'NMC Dialysis Center',
    client: 'NMC Healthcare',
    interviewDate: '2025-10-21',
    interviewTime: '16:00',
    duration: 40,
    type: 'online',
    mode: 'panel',
    status: 'no_show',
    interviewer: 'Dr. Rajesh Kumar',
    panelMembers: ['Dr. Rajesh Kumar', 'Technical Lead Ali', 'Supervisor Maya'],
    meetingLink: 'https://zoom.us/j/987654321',
    notes: 'Candidate did not join the scheduled interview.',
    createdBy: 'Recruiter Omar',
    timezone: 'UAE/Dubai',
    reminderSent: true,
    candidateConfirmed: false,
  },
  {
    id: '5',
    candidateName: 'Maria Garcia',
    candidateId: 'CND005',
    candidatePhoto: 'https://i.pravatar.cc/150?u=maria',
    designation: 'Pediatric Nurse',
    project: 'Al Jalila Pediatric Unit',
    client: 'Al Jalila Children\'s Hospital',
    interviewDate: '2025-10-28',
    interviewTime: '11:30',
    duration: 50,
    type: 'offline',
    mode: 'panel',
    status: 'rescheduled',
    interviewer: 'Dr. Elena Rodriguez',
    panelMembers: ['Dr. Elena Rodriguez', 'Head Nurse Fatima', 'Child Specialist Dr. Ali'],
    location: 'Al Jalila Hospital, Pediatric Conference Room',
    notes: 'Rescheduled due to candidate\'s medical emergency. New date to be confirmed.',
    createdBy: 'Recruiter Sarah',
    timezone: 'UAE/Dubai',
    reminderSent: false,
    candidateConfirmed: false,
  },
  {
    id: '6',
    candidateName: 'James Wilson',
    candidateId: 'CND006',
    candidatePhoto: 'https://i.pravatar.cc/150?u=james',
    designation: 'Lab Technician',
    project: 'Dubai Hospital Lab Expansion',
    client: 'Dubai Hospital',
    interviewDate: '2025-10-20',
    interviewTime: '13:45',
    duration: 35,
    type: 'online',
    mode: 'one_on_one',
    status: 'completed',
    interviewer: 'Dr. Lisa Chen',
    meetingLink: 'https://zoom.us/j/456789123',
    notes: 'Laboratory procedures and quality control assessment.',
    result: 'failed',
    score: 5.2,
    feedback: 'Lacks experience in advanced laboratory equipment. Needs additional training.',
    createdBy: 'Recruiter Michael',
    timezone: 'UAE/Dubai',
    reminderSent: true,
    candidateConfirmed: true,
  },
  {
    id: '7',
    candidateName: 'Aisha Mohamed',
    candidateId: 'CND007',
    candidatePhoto: 'https://i.pravatar.cc/150?u=aisha',
    designation: 'Physiotherapist',
    project: 'Rehabilitation Center Staffing',
    client: 'HealthPoint Hospital',
    interviewDate: '2025-10-30',
    interviewTime: '15:00',
    duration: 45,
    type: 'offline',
    mode: 'one_on_one',
    status: 'scheduled',
    interviewer: 'Dr. Mohammed Ali',
    location: 'HealthPoint Hospital, Physiotherapy Department',
    notes: 'Practical assessment of physiotherapy techniques and patient interaction.',
    createdBy: 'Recruiter Priya',
    timezone: 'UAE/Dubai',
    reminderSent: false,
    candidateConfirmed: true,
  },
];

const InterviewsScreen: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>(dummyInterviews);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('today');
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return COLORS.primary;
      case 'ongoing':
        return COLORS.warning;
      case 'completed':
        return COLORS.success;
      case 'cancelled':
        return COLORS.error;
      case 'rescheduled':
        return COLORS.info;
      case 'no_show':
        return COLORS.error;
      default:
        return COLORS.gray;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'ongoing':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'rescheduled':
        return 'Rescheduled';
      case 'no_show':
        return 'No Show';
      default:
        return status;
    }
  };

  const getResultColor = (result?: string) => {
    switch (result) {
      case 'passed':
        return COLORS.success;
      case 'failed':
        return COLORS.error;
      case 'pending':
        return COLORS.warning;
      default:
        return COLORS.gray;
    }
  };

  const getTypeIcon = (type: string, mode: string) => {
    if (type === 'online') {
      return mode === 'panel' ? 'video-account' : 'video';
    } else {
      return mode === 'panel' ? 'account-group' : 'account';
    }
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const getTimeStatus = (date: string, time: string, status: string) => {
    const interviewDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    const diffMinutes = Math.floor((interviewDateTime.getTime() - now.getTime()) / (1000 * 60));
    
    if (status === 'ongoing') return { text: 'In Progress', color: COLORS.warning };
    if (status === 'completed') return { text: 'Completed', color: COLORS.success };
    if (status === 'cancelled' || status === 'no_show') return { text: getStatusText(status), color: COLORS.error };
    
    if (diffMinutes < 0) return { text: 'Past Due', color: COLORS.error };
    if (diffMinutes <= 30) return { text: `${diffMinutes}m left`, color: COLORS.error };
    if (diffMinutes <= 120) return { text: `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`, color: COLORS.warning };
    
    return { text: formatTime(time), color: COLORS.primary };
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         interview.candidateId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         interview.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         interview.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         interview.interviewer.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    const today = new Date().toISOString().split('T')[0];
    const interviewDate = interview.interviewDate;
    
    switch (selectedFilter) {
      case 'today':
        matchesFilter = interviewDate === today;
        break;
      case 'upcoming':
        matchesFilter = interviewDate >= today && interview.status === 'scheduled';
        break;
      case 'completed':
        matchesFilter = interview.status === 'completed';
        break;
      case 'pending':
        matchesFilter = interview.status === 'scheduled' || interview.status === 'rescheduled';
        break;
      case 'issues':
        matchesFilter = interview.status === 'cancelled' || interview.status === 'no_show';
        break;
    }
    
    return matchesSearch && matchesFilter;
  });

  const handleInterviewPress = (interview: Interview) => {
    setSelectedInterview(interview);
    setModalVisible(true);
  };

  const handleInterviewAction = (action: 'join' | 'reschedule' | 'cancel' | 'complete') => {
    const interview = selectedInterview;
    if (!interview) return;

    switch (action) {
      case 'join':
        Alert.alert('Join Interview', `Opening ${interview.type === 'online' ? 'video call' : 'location info'} for ${interview.candidateName}`);
        break;
      case 'reschedule':
        Alert.alert('Reschedule Interview', `Reschedule interview with ${interview.candidateName}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reschedule', onPress: () => console.log('Reschedule interview') }
        ]);
        break;
      case 'cancel':
        Alert.alert('Cancel Interview', `Cancel interview with ${interview.candidateName}?`, [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: () => console.log('Cancel interview') }
        ]);
        break;
      case 'complete':
        Alert.alert('Complete Interview', `Mark interview with ${interview.candidateName} as completed?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: () => console.log('Complete interview') }
        ]);
        break;
    }
  };

  const renderInterviewCard = ({ item }: { item: Interview }) => {
    const timeStatus = getTimeStatus(item.interviewDate, item.interviewTime, item.status);
    
    return (
      <TouchableOpacity
        style={styles.interviewCard}
        onPress={() => handleInterviewPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.candidateInfo}>
            <Text style={styles.candidateName}>{item.candidateName}</Text>
            <Text style={styles.candidateId}>ID: {item.candidateId}</Text>
            <Text style={styles.designation}>{item.designation}</Text>
            <Text style={styles.project}>{item.project}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
            {item.result && (
              <View style={[styles.resultBadge, { backgroundColor: getResultColor(item.result) }]}>
                <Text style={styles.resultText}>{item.result.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.interviewDetails}>
            <View style={styles.detailRow}>
              <Icon name="calendar" size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>{item.interviewDate}</Text>
            </View>
            <View style={styles.detailRow}>
              <Icon name="clock" size={14} color={timeStatus.color} />
              <Text style={[styles.detailText, { color: timeStatus.color }]}>{timeStatus.text}</Text>
            </View>
            <View style={styles.detailRow}>
              <Icon name={getTypeIcon(item.type, item.mode)} size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>
                {item.type === 'online' ? 'Online' : 'In-person'} • {item.mode === 'panel' ? 'Panel' : '1:1'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Icon name="account-tie" size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>{item.interviewer}</Text>
            </View>
            {item.duration && (
              <View style={styles.detailRow}>
                <Icon name="timer" size={14} color={COLORS.gray} />
                <Text style={styles.detailText}>{item.duration} minutes</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.clientInfo}>
            <Icon name="domain" size={14} color={COLORS.gray} />
            <Text style={styles.clientText}>{item.client}</Text>
          </View>
          <View style={styles.confirmationInfo}>
            {item.candidateConfirmed ? (
              <>
                <Icon name="check-circle" size={14} color={COLORS.success} />
                <Text style={[styles.confirmationText, { color: COLORS.success }]}>Confirmed</Text>
              </>
            ) : (
              <>
                <Icon name="clock-alert" size={14} color={COLORS.warning} />
                <Text style={[styles.confirmationText, { color: COLORS.warning }]}>Pending</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderInterviewModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedInterview?.candidateName} - Interview Details
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {selectedInterview && (
            <View style={styles.modalBody}>
              <View style={styles.interviewInfo}>
                <Text style={styles.sectionTitle}>Interview Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Date & Time</Text>
                    <Text style={styles.infoValue}>
                      {selectedInterview.interviewDate} at {formatTime(selectedInterview.interviewTime)}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Duration</Text>
                    <Text style={styles.infoValue}>{selectedInterview.duration} minutes</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>
                      {selectedInterview.type === 'online' ? 'Online' : 'In-person'} • {selectedInterview.mode === 'panel' ? 'Panel Interview' : 'One-on-One'}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Interviewer</Text>
                    <Text style={styles.infoValue}>{selectedInterview.interviewer}</Text>
                  </View>
                  
                  {selectedInterview.panelMembers && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Panel Members</Text>
                      <Text style={styles.infoValue}>{selectedInterview.panelMembers.join(', ')}</Text>
                    </View>
                  )}

                  {selectedInterview.meetingLink && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Meeting Link</Text>
                      <Text style={[styles.infoValue, styles.linkText]}>{selectedInterview.meetingLink}</Text>
                    </View>
                  )}

                  {selectedInterview.location && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Location</Text>
                      <Text style={styles.infoValue}>{selectedInterview.location}</Text>
                    </View>
                  )}

                  {selectedInterview.notes && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Notes</Text>
                      <Text style={styles.infoValue}>{selectedInterview.notes}</Text>
                    </View>
                  )}

                  {selectedInterview.result && (
                    <>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Result</Text>
                        <Text style={[styles.infoValue, { color: getResultColor(selectedInterview.result) }]}>
                          {selectedInterview.result.toUpperCase()}
                        </Text>
                      </View>
                      {selectedInterview.score && (
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Score</Text>
                          <Text style={styles.infoValue}>{selectedInterview.score}/10</Text>
                        </View>
                      )}
                      {selectedInterview.feedback && (
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Feedback</Text>
                          <Text style={styles.infoValue}>{selectedInterview.feedback}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>

              <View style={styles.actionButtons}>
                {selectedInterview.status === 'scheduled' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                      onPress={() => handleInterviewAction('join')}
                    >
                      <Icon name={selectedInterview.type === 'online' ? 'video' : 'map-marker'} size={16} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>
                        {selectedInterview.type === 'online' ? 'Join Meeting' : 'View Location'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: COLORS.warning }]}
                      onPress={() => handleInterviewAction('reschedule')}
                    >
                      <Icon name="calendar-edit" size={16} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>Reschedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: COLORS.error }]}
                      onPress={() => handleInterviewAction('cancel')}
                    >
                      <Icon name="cancel" size={16} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {selectedInterview.status === 'ongoing' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                    onPress={() => handleInterviewAction('complete')}
                  >
                    <Icon name="check" size={16} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Mark Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const filterOptions = [
    { key: 'today', label: 'Today', count: interviews.filter(i => i.interviewDate === new Date().toISOString().split('T')[0]).length },
    { key: 'upcoming', label: 'Upcoming', count: interviews.filter(i => i.status === 'scheduled').length },
    { key: 'completed', label: 'Completed', count: interviews.filter(i => i.status === 'completed').length },
    { key: 'pending', label: 'Pending', count: interviews.filter(i => i.status === 'scheduled' || i.status === 'rescheduled').length },
    { key: 'issues', label: 'Issues', count: interviews.filter(i => i.status === 'cancelled' || i.status === 'no_show').length },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={COLORS.background}
        translucent={false}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Interviews</Text>
        <Text style={styles.subtitle}>{filteredInterviews.length} interviews found</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search interviews, candidates..."
          placeholderTextColor={COLORS.light}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
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
              onPress={() => setSelectedFilter(item.key)}
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

      {/* Interviews List */}
      <FlatList
        data={filteredInterviews}
        keyExtractor={(item) => item.id}
        renderItem={renderInterviewCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar-check" size={64} color={COLORS.light} />
            <Text style={styles.emptyTitle}>No interviews found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No interviews match the selected filter'}
            </Text>
          </View>
        }
      />

      {/* Interview Detail Modal */}
      {renderInterviewModal()}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => Alert.alert('Schedule Interview', 'This would open the interview scheduling form')}
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
  interviewCard: {
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
  candidateInfo: {
    flex: 1,
    paddingRight: 12,
  },
  candidateName: {
    fontSize: isIOS ? 17 : 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 2,
  },
  candidateId: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
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
    marginBottom: 4,
    minWidth: isIOS ? 70 : 65,
    alignItems: 'center',
  },
  statusText: {
    fontSize: isIOS ? 11 : 10,
    color: COLORS.white,
    fontWeight: '600',
  },
  resultBadge: {
    paddingHorizontal: isIOS ? 10 : 8,
    paddingVertical: isIOS ? 4 : 3,
    borderRadius: 8,
    alignItems: 'center',
  },
  resultText: {
    fontSize: isIOS ? 10 : 9,
    color: COLORS.white,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
  },
  interviewDetails: {
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.lighter,
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
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  confirmationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmationText: {
    fontSize: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: isIOS ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lighter,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  interviewInfo: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.dark,
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingTop: 0,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: '30%',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default InterviewsScreen;
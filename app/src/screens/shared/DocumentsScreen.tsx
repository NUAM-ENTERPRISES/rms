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

interface Document {
  id: string;
  type: 'passport' | 'license' | 'degree' | 'police_clearance' | 'medical' | 'experience' | 'photo';
  name: string;
  fileName: string;
  uploadDate: string;
  expiryDate?: string;
  fileSize: string;
  status: 'pending' | 'verified' | 'rejected' | 'needs_fix';
  verifiedBy?: string;
  verificationDate?: string;
  rejectionReason?: string;
  notes?: string;
}

interface CandidateDocument {
  id: string;
  candidateName: string;
  candidateId: string;
  designation: string;
  project: string;
  submissionDate: string;
  totalDocuments: number;
  verifiedDocuments: number;
  priority: 'high' | 'normal' | 'low';
  assignedTo?: string;
  slaHours: number;
  documents: Document[];
  candidatePhoto: string;
  phone: string;
  email: string;
}

// Dummy document verification data
const dummyCandidateDocuments: CandidateDocument[] = [
  {
    id: '1',
    candidateName: 'Sarah Johnson',
    candidateId: 'CND001',
    designation: 'ICU Nurse',
    project: 'Emirates Hospital ICU Expansion',
    submissionDate: '2024-01-20T10:30:00Z',
    totalDocuments: 6,
    verifiedDocuments: 3,
    priority: 'high',
    assignedTo: 'Dr. Ahmed Hassan',
    slaHours: 8,
    candidatePhoto: 'https://i.pravatar.cc/150?u=sarah',
    phone: '+971-50-123-4567',
    email: 'sarah.johnson@email.com',
    documents: [
      {
        id: '1-1',
        type: 'passport',
        name: 'Passport Copy',
        fileName: 'sarah_passport.pdf',
        uploadDate: '2024-01-20T10:30:00Z',
        expiryDate: '2028-05-15',
        fileSize: '2.3 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-20T14:30:00Z',
      },
      {
        id: '1-2',
        type: 'license',
        name: 'Nursing License',
        fileName: 'sarah_nursing_license.pdf',
        uploadDate: '2024-01-20T10:35:00Z',
        expiryDate: '2026-12-31',
        fileSize: '1.8 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-20T15:00:00Z',
      },
      {
        id: '1-3',
        type: 'degree',
        name: 'BSc Nursing Certificate',
        fileName: 'sarah_degree.pdf',
        uploadDate: '2024-01-20T10:40:00Z',
        fileSize: '3.1 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-20T16:30:00Z',
      },
      {
        id: '1-4',
        type: 'experience',
        name: 'Experience Certificate',
        fileName: 'sarah_experience.pdf',
        uploadDate: '2024-01-20T10:45:00Z',
        fileSize: '1.2 MB',
        status: 'pending',
      },
      {
        id: '1-5',
        type: 'police_clearance',
        name: 'Police Clearance',
        fileName: 'sarah_police.pdf',
        uploadDate: '2024-01-20T10:50:00Z',
        fileSize: '0.8 MB',
        status: 'pending',
      },
      {
        id: '1-6',
        type: 'photo',
        name: 'Passport Size Photo',
        fileName: 'sarah_photo.jpg',
        uploadDate: '2024-01-20T10:55:00Z',
        fileSize: '0.5 MB',
        status: 'pending',
      },
    ],
  },
  {
    id: '2',
    candidateName: 'Michael Chen',
    candidateId: 'CND002',
    designation: 'Theater Nurse',
    project: 'Cleveland Clinic Surgery Department',
    submissionDate: '2024-01-19T14:20:00Z',
    totalDocuments: 5,
    verifiedDocuments: 2,
    priority: 'high',
    assignedTo: 'Dr. Fatima Al-Zahra',
    slaHours: 16,
    candidatePhoto: 'https://i.pravatar.cc/150?u=michael',
    phone: '+971-52-987-6543',
    email: 'michael.chen@email.com',
    documents: [
      {
        id: '2-1',
        type: 'passport',
        name: 'Passport Copy',
        fileName: 'michael_passport.pdf',
        uploadDate: '2024-01-19T14:20:00Z',
        expiryDate: '2029-03-10',
        fileSize: '2.1 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-19T18:45:00Z',
      },
      {
        id: '2-2',
        type: 'license',
        name: 'Nursing License',
        fileName: 'michael_license.pdf',
        uploadDate: '2024-01-19T14:25:00Z',
        expiryDate: '2025-11-30',
        fileSize: '1.9 MB',
        status: 'rejected',
        rejectionReason: 'License appears to be expired. Please submit renewed license.',
        notes: 'Candidate contacted via email for resubmission.',
      },
      {
        id: '2-3',
        type: 'degree',
        name: 'MSc Nursing Certificate',
        fileName: 'michael_degree.pdf',
        uploadDate: '2024-01-19T14:30:00Z',
        fileSize: '2.8 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-19T19:15:00Z',
      },
      {
        id: '2-4',
        type: 'experience',
        name: 'Experience Certificate',
        fileName: 'michael_exp.pdf',
        uploadDate: '2024-01-19T14:35:00Z',
        fileSize: '1.5 MB',
        status: 'needs_fix',
        rejectionReason: 'Experience certificate needs hospital seal. Please resubmit.',
      },
      {
        id: '2-5',
        type: 'photo',
        name: 'Professional Photo',
        fileName: 'michael_photo.jpg',
        uploadDate: '2024-01-19T14:40:00Z',
        fileSize: '0.6 MB',
        status: 'pending',
      },
    ],
  },
  {
    id: '3',
    candidateName: 'Priya Sharma',
    candidateId: 'CND003',
    designation: 'Emergency Nurse',
    project: 'Al Qassimi Emergency Department',
    submissionDate: '2024-01-21T09:15:00Z',
    totalDocuments: 7,
    verifiedDocuments: 6,
    priority: 'normal',
    assignedTo: 'Dr. Omar Hassan',
    slaHours: 4,
    candidatePhoto: 'https://i.pravatar.cc/150?u=priya',
    phone: '+971-55-456-7890',
    email: 'priya.sharma@email.com',
    documents: [
      {
        id: '3-1',
        type: 'passport',
        name: 'Passport Copy',
        fileName: 'priya_passport.pdf',
        uploadDate: '2024-01-21T09:15:00Z',
        expiryDate: '2027-08-22',
        fileSize: '2.0 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-21T11:30:00Z',
      },
      {
        id: '3-2',
        type: 'license',
        name: 'Nursing Registration',
        fileName: 'priya_license.pdf',
        uploadDate: '2024-01-21T09:20:00Z',
        expiryDate: '2026-06-30',
        fileSize: '1.7 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-21T12:00:00Z',
      },
      {
        id: '3-3',
        type: 'degree',
        name: 'Nursing Degree',
        fileName: 'priya_degree.pdf',
        uploadDate: '2024-01-21T09:25:00Z',
        fileSize: '2.9 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-21T12:30:00Z',
      },
      {
        id: '3-4',
        type: 'experience',
        name: 'Work Experience',
        fileName: 'priya_experience.pdf',
        uploadDate: '2024-01-21T09:30:00Z',
        fileSize: '1.4 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-21T13:00:00Z',
      },
      {
        id: '3-5',
        type: 'police_clearance',
        name: 'Background Check',
        fileName: 'priya_police.pdf',
        uploadDate: '2024-01-21T09:35:00Z',
        fileSize: '0.9 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-21T13:30:00Z',
      },
      {
        id: '3-6',
        type: 'medical',
        name: 'Medical Certificate',
        fileName: 'priya_medical.pdf',
        uploadDate: '2024-01-21T09:40:00Z',
        fileSize: '1.1 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-21T14:00:00Z',
      },
      {
        id: '3-7',
        type: 'photo',
        name: 'Profile Photo',
        fileName: 'priya_photo.jpg',
        uploadDate: '2024-01-21T09:45:00Z',
        fileSize: '0.4 MB',
        status: 'pending',
      },
    ],
  },
  {
    id: '4',
    candidateName: 'Ahmed Al-Rashid',
    candidateId: 'CND004',
    designation: 'Dialysis Technician',
    project: 'NMC Dialysis Center',
    submissionDate: '2024-01-18T16:45:00Z',
    totalDocuments: 4,
    verifiedDocuments: 4,
    priority: 'low',
    assignedTo: 'Dr. Sarah Johnson',
    slaHours: 0,
    candidatePhoto: 'https://i.pravatar.cc/150?u=ahmed',
    phone: '+971-56-789-0123',
    email: 'ahmed.rashid@email.com',
    documents: [
      {
        id: '4-1',
        type: 'passport',
        name: 'Passport',
        fileName: 'ahmed_passport.pdf',
        uploadDate: '2024-01-18T16:45:00Z',
        expiryDate: '2030-01-15',
        fileSize: '2.2 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-19T09:30:00Z',
      },
      {
        id: '4-2',
        type: 'degree',
        name: 'Technical Certificate',
        fileName: 'ahmed_cert.pdf',
        uploadDate: '2024-01-18T16:50:00Z',
        fileSize: '1.8 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-19T10:00:00Z',
      },
      {
        id: '4-3',
        type: 'experience',
        name: 'Experience Letter',
        fileName: 'ahmed_exp.pdf',
        uploadDate: '2024-01-18T16:55:00Z',
        fileSize: '1.3 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-19T10:30:00Z',
      },
      {
        id: '4-4',
        type: 'photo',
        name: 'ID Photo',
        fileName: 'ahmed_photo.jpg',
        uploadDate: '2024-01-18T17:00:00Z',
        fileSize: '0.7 MB',
        status: 'verified',
        verifiedBy: 'Documentation Team',
        verificationDate: '2024-01-19T11:00:00Z',
      },
    ],
  },
];

const DocumentsScreen: React.FC = () => {
  const [candidateDocuments, setCandidateDocuments] = useState<CandidateDocument[]>(dummyCandidateDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('pending');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDocument | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'rejected':
        return COLORS.error;
      case 'needs_fix':
        return COLORS.brandBlue;
      default:
        return COLORS.gray;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      case 'needs_fix':
        return 'Needs Fix';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return COLORS.error;
      case 'normal':
        return COLORS.info;
      case 'low':
        return COLORS.gray;
      default:
        return COLORS.light;
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'passport':
        return 'passport';
      case 'license':
        return 'certificate';
      case 'degree':
        return 'school';
      case 'police_clearance':
        return 'shield-check';
      case 'medical':
        return 'medical-bag';
      case 'experience':
        return 'briefcase';
      case 'photo':
        return 'camera';
      default:
        return 'file-document';
    }
  };

  const getSLAStatus = (slaHours: number) => {
    if (slaHours <= 4) return { color: COLORS.error, text: 'Critical' };
    if (slaHours <= 12) return { color: COLORS.warning, text: 'Due Soon' };
    return { color: COLORS.success, text: 'On Time' };
  };

  const filteredCandidates = candidateDocuments.filter(candidate => {
    const matchesSearch = candidate.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         candidate.candidateId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         candidate.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         candidate.project.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    if (selectedFilter === 'pending') {
      matchesFilter = candidate.documents.some(doc => doc.status === 'pending');
    } else if (selectedFilter === 'completed') {
      matchesFilter = candidate.verifiedDocuments === candidate.totalDocuments;
    } else if (selectedFilter === 'rejected') {
      matchesFilter = candidate.documents.some(doc => doc.status === 'rejected' || doc.status === 'needs_fix');
    } else if (selectedFilter === 'overdue') {
      matchesFilter = candidate.slaHours <= 4;
    }
    
    return matchesSearch && matchesFilter;
  });

  const handleCandidatePress = (candidate: CandidateDocument) => {
    setSelectedCandidate(candidate);
    setModalVisible(true);
  };

  const handleDocumentAction = (documentId: string, action: 'verify' | 'reject') => {
    Alert.alert(
      `${action === 'verify' ? 'Verify' : 'Reject'} Document`,
      `Are you sure you want to ${action} this document?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'verify' ? 'Verify' : 'Reject',
          onPress: () => console.log(`${action} document ${documentId}`)
        }
      ]
    );
  };

  const renderCandidateCard = ({ item }: { item: CandidateDocument }) => {
    const completionPercentage = Math.round((item.verifiedDocuments / item.totalDocuments) * 100);
    const slaStatus = getSLAStatus(item.slaHours);

    return (
      <TouchableOpacity
        style={styles.candidateCard}
        onPress={() => handleCandidatePress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.candidateInfo}>
            <Text style={styles.candidateName}>{item.candidateName}</Text>
            <Text style={styles.candidateId}>ID: {item.candidateId}</Text>
            <Text style={styles.designation}>{item.designation}</Text>
            <Text style={styles.project}>{item.project}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
            </View>
            <View style={[styles.slaBadge, { backgroundColor: slaStatus.color }]}>
              <Text style={styles.slaText}>{item.slaHours}h left</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>
              Documents: {item.verifiedDocuments}/{item.totalDocuments} verified
            </Text>
            <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${completionPercentage}%`, 
                  backgroundColor: completionPercentage === 100 ? COLORS.success : COLORS.primary 
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.documentsList}>
          <Text style={styles.documentsLabel}>Pending Documents:</Text>
          <View style={styles.documentsGrid}>
            {item.documents
              .filter(doc => doc.status === 'pending' || doc.status === 'needs_fix' || doc.status === 'rejected')
              .slice(0, 4)
              .map((doc, index) => (
                <View key={index} style={styles.documentChip}>
                  <Icon 
                    name={getDocumentIcon(doc.type)} 
                    size={12} 
                    color={getStatusColor(doc.status)} 
                  />
                  <Text style={[styles.documentChipText, { color: getStatusColor(doc.status) }]}>
                    {doc.name}
                  </Text>
                </View>
              ))}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.timeInfo}>
            <Icon name="clock" size={14} color={slaStatus.color} />
            <Text style={[styles.slaStatusText, { color: slaStatus.color }]}>
              {slaStatus.text}
            </Text>
          </View>
          <View style={styles.assigneeInfo}>
            <Icon name="account" size={14} color={COLORS.gray} />
            <Text style={styles.assigneeText}>
              {item.assignedTo || 'Unassigned'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDocumentModal = () => (
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
              {selectedCandidate?.candidateName} - Documents
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={selectedCandidate?.documents || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item: doc }) => (
              <View style={styles.documentItem}>
                <View style={styles.documentInfo}>
                  <Icon 
                    name={getDocumentIcon(doc.type)} 
                    size={20} 
                    color={getStatusColor(doc.status)} 
                  />
                  <View style={styles.documentDetails}>
                    <Text style={styles.documentName}>{doc.name}</Text>
                    <Text style={styles.fileName}>{doc.fileName}</Text>
                    <Text style={styles.fileSize}>{doc.fileSize} • {doc.uploadDate.split('T')[0]}</Text>
                    {doc.expiryDate && (
                      <Text style={styles.expiryDate}>Expires: {doc.expiryDate}</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.documentActions}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(doc.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(doc.status)}</Text>
                  </View>
                  
                  {doc.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                        onPress={() => handleDocumentAction(doc.id, 'verify')}
                      >
                        <Icon name="check" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.error }]}
                        onPress={() => handleDocumentAction(doc.id, 'reject')}
                      >
                        <Icon name="close" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {doc.rejectionReason && (
                  <View style={styles.rejectionReason}>
                    <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>
                  </View>
                )}
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );

  const filterOptions = [
    { key: 'pending', label: 'Pending Review', count: candidateDocuments.filter(c => c.documents.some(d => d.status === 'pending')).length },
    { key: 'rejected', label: 'Need Action', count: candidateDocuments.filter(c => c.documents.some(d => d.status === 'rejected' || d.status === 'needs_fix')).length },
    { key: 'completed', label: 'Completed', count: candidateDocuments.filter(c => c.verifiedDocuments === c.totalDocuments).length },
    { key: 'overdue', label: 'Overdue', count: candidateDocuments.filter(c => c.slaHours <= 4).length },
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
        <Text style={styles.title}>Document Verification</Text>
        <Text style={styles.subtitle}>{filteredCandidates.length} candidates pending review</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search candidates, projects..."
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

      {/* Candidates List */}
      <FlatList
        data={filteredCandidates}
        keyExtractor={(item) => item.id}
        renderItem={renderCandidateCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-document-multiple" size={64} color={COLORS.light} />
            <Text style={styles.emptyTitle}>No documents to review</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search criteria' : 'All documents have been processed'}
            </Text>
          </View>
        }
      />

      {/* Document Detail Modal */}
      {renderDocumentModal()}
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
  candidateCard: {
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
  priorityBadge: {
    paddingHorizontal: isIOS ? 10 : 8,
    paddingVertical: isIOS ? 4 : 3,
    borderRadius: 8,
    marginBottom: 4,
    minWidth: isIOS ? 50 : 45,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: isIOS ? 10 : 9,
    color: COLORS.white,
    fontWeight: '600',
  },
  slaBadge: {
    paddingHorizontal: isIOS ? 10 : 8,
    paddingVertical: isIOS ? 4 : 3,
    borderRadius: 8,
    alignItems: 'center',
  },
  slaText: {
    fontSize: isIOS ? 11 : 10,
    color: COLORS.white,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.lighter,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: COLORS.lighter,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  documentsList: {
    marginBottom: 12,
  },
  documentsLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
    marginBottom: 6,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  documentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  documentChipText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.lighter,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slaStatusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  assigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeText: {
    fontSize: 12,
    color: COLORS.gray,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
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
  documentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lighter,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  documentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  fileName: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 11,
    color: COLORS.gray,
  },
  expiryDate: {
    fontSize: 11,
    color: COLORS.warning,
    marginTop: 2,
  },
  documentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectionReason: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectionText: {
    fontSize: 12,
    color: COLORS.error,
    fontStyle: 'italic',
  },
});

export default DocumentsScreen;
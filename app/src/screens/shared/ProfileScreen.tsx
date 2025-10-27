import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useLogoutMutation } from '../../features/auth/authApi';
import { COLORS } from '../../constants/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// iOS specific padding adjustments
const isIOS = Platform.OS === 'ios';
const statusBarHeight = Platform.select({
  ios: 44,
  android: StatusBar.currentHeight || 24,
});

const ProfileScreen: React.FC = () => {
  const { user } = useUserProfile();
  const [logout] = useLogoutMutation();

  // Mock user data with more details for demonstration
  const mockUser = user || {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@emirates-hospital.ae',
    roles: ['Senior Recruiter', 'HR Manager'],
    department: 'Human Resources',
    employeeId: 'EMP001',
    joinDate: '2022-03-15',
    mobileNumber: '+971 50 123 4567',
    location: 'Dubai, UAE',
    profileCompleteness: 85,
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout().unwrap();
            } catch (error) {
              console.error('Logout failed:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'This would open the profile editing screen');
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'This would open the change password screen');
  };

  const handleNotifications = () => {
    Alert.alert('Notifications', 'This would open notification settings');
  };

  const handleSupport = () => {
    Alert.alert('Support', 'This would open the support/help screen');
  };

  const menuItems = [
    { icon: 'account-edit', title: 'Edit Profile', onPress: handleEditProfile },
    { icon: 'lock-reset', title: 'Change Password', onPress: handleChangePassword },
    { icon: 'bell-outline', title: 'Notifications', onPress: handleNotifications },
    { icon: 'help-circle-outline', title: 'Help & Support', onPress: handleSupport },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={COLORS.primary}
        translucent={false}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Gradient Background */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {/* Profile Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Icon name="account" size={60} color={COLORS.white} />
              </View>
              <TouchableOpacity style={styles.avatarEditButton} onPress={handleEditProfile}>
                <Icon name="camera" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {/* User Info */}
            <Text style={styles.userName}>{mockUser.name}</Text>
            <Text style={styles.userEmail}>{mockUser.email}</Text>
            {/* <View style={styles.employeeInfo}>
              <Text style={styles.employeeId}>ID: {mockUser.employeeId}</Text>
              <Text style={styles.department}>{mockUser.department}</Text>
            </View> */}

         
          </View>
        </View>

        {/* Quick Info Cards */}
        <View style={styles.quickInfoContainer}>
          <View style={styles.infoCard}>
            <Icon name="calendar-check" size={24} color={COLORS.primary} />
            <Text style={styles.infoCardLabel}>Join Date</Text>
            <Text style={styles.infoCardValue}>20 Jan 2020</Text>
          </View>
          <View style={styles.infoCard}>
            <Icon name="map-marker" size={24} color={COLORS.primary} />
            <Text style={styles.infoCardLabel}>Location</Text>
            <Text style={styles.infoCardValue}>Kochi</Text>
          </View>
        </View>

        {/* Roles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="account-group" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Current Roles</Text>
          </View>
          <View style={styles.rolesContainer}>
            {mockUser.roles?.map((role, index) => (
              <View key={index} style={styles.roleBadge}>
                <Icon name="shield-account" size={16} color={COLORS.white} />
                <Text style={styles.roleText}>{role}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="card-account-details" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Icon name="email-outline" size={18} color={COLORS.gray} />
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{mockUser.email}</Text>
            </View>
            <View style={styles.contactItem}>
              <Icon name="phone-outline" size={18} color={COLORS.gray} />
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{mockUser.mobileNumber}</Text>
            </View>
            <View style={styles.contactItem}>
              <Icon name="domain" size={18} color={COLORS.gray} />
              <Text style={styles.contactLabel}>Department</Text>
              <Text style={styles.contactValue}>Recruiter</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="cog-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.menuItem} 
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <Icon name={item.icon} size={20} color={COLORS.gray} />
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={COLORS.light} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Icon name="logout" size={20} color={COLORS.white} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
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
  scrollContent: {
    paddingBottom: isIOS ? 30 : 20,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: isIOS ? 20 : 16,
    paddingBottom: 30,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: isIOS ? 0.3 : 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: isIOS ? 26 : 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: isIOS ? 16 : 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textAlign: 'center',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  employeeId: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  department: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completenessContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completenessText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  completenessPercentage: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 3,
  },
  quickInfoContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    marginTop: -15,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: isIOS ? 18 : 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: isIOS ? 4 : 3,
    },
    shadowOpacity: isIOS ? 0.15 : 0.12,
    shadowRadius: isIOS ? 8 : 6,
    elevation: 4,
  },
  infoCardLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  infoCardValue: {
    fontSize: isIOS ? 14 : 13,
    color: COLORS.dark,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: isIOS ? 20 : 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: isIOS ? 3 : 2,
    },
    shadowOpacity: isIOS ? 0.12 : 0.1,
    shadowRadius: isIOS ? 6 : 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isIOS ? 18 : 17,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginLeft: 8,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: isIOS ? 14 : 12,
    paddingVertical: isIOS ? 8 : 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  roleText: {
    color: COLORS.white,
    fontSize: isIOS ? 14 : 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  contactInfo: {
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
    width: 80,
    marginLeft: 12,
  },
  contactValue: {
    fontSize: isIOS ? 15 : 14,
    color: COLORS.dark,
    flex: 1,
  },
  menuContainer: {
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: isIOS ? 16 : 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.lighter,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: isIOS ? 16 : 15,
    color: COLORS.dark,
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: isIOS ? 16 : 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: isIOS ? 4 : 3,
    },
    shadowOpacity: isIOS ? 0.25 : 0.2,
    shadowRadius: isIOS ? 6 : 4,
    elevation: 4,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: isIOS ? 17 : 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProfileScreen;
import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TextInput,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../components/CustomText';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomButton from '../components/CustomButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size; // Base width: iPhone 12 (375px)
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size; // Base height: iPhone 12 (812px)
const moderateScale = (size: number, factor: number = 0.5) => 
    size + (scaleWidth(size) - size) * factor;

// Device type detection
const isSmallDevice = SCREEN_WIDTH <= 320;   // iPhone SE, small Android
const isTablet = SCREEN_WIDTH >= 768;        // iPad, tablets

const LoginScreen = () => {
    const navigation = useNavigation<LoginScreenNavigationProp>();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ email: '', password: '', root: '' });

    const validateForm = () => {
        const newErrors = { email: '', password: '', root: '' };
        let isValid = true;

        if (!email) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
            isValid = false;
        }

        if (!password) {
            newErrors.password = 'Password is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setIsLoading(true);

        try {
            console.log('Login successful:', { email, password });
            navigation.replace('Home');
        } catch (error) {
            setErrors({ ...errors, root: 'Invalid email or password' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        Alert.alert('Forgot Password', 'Password reset feature coming soon!');
    };

    const handleRequestAccess = () => {
        Alert.alert('Request Access', 'Access request feature coming soon!');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.contentContainer}>
                    {/* Single Card */}
                    <View style={styles.singleCard}>
                        {/* Logo */}
                        <View style={styles.logoSection}>
                            <Image
                                source={require('../assets/logo/affiniks_logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>

                        {/* Header */}
                        <View style={styles.cardHeader}>
                            <CustomText preset="heading" style={styles.welcomeText}>
                                Welcome back
                            </CustomText>
                            <CustomText preset="body" style={styles.subtitle}>
                                Sign in to your Affiniks RMS account
                            </CustomText>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            {/* Email */}
                            <View style={styles.inputGroup}>
                                <CustomText preset="bodyMedium" style={styles.label}>
                                    Email address
                                </CustomText>
                                <View style={[
                                    styles.inputWrapper,
                                    errors.email && styles.inputError
                                ]}>
                                    <Icon 
                                        name="email-outline" 
                                        size={moderateScale(20)} 
                                        color="#64748b" 
                                        style={styles.leftIcon} 
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter your email"
                                        placeholderTextColor="#94a3b8"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            setErrors({ ...errors, email: '' });
                                        }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                    />
                                </View>
                                {errors.email ? (
                                    <CustomText preset="caption" style={styles.errorText}>
                                        {errors.email}
                                    </CustomText>
                                ) : null}
                            </View>

                            {/* Password */}
                            <View style={styles.inputGroup}>
                                <CustomText preset="bodyMedium" style={styles.label}>
                                    Password
                                </CustomText>
                                <View style={[
                                    styles.inputWrapper,
                                    errors.password && styles.inputError
                                ]}>
                                    <Icon 
                                        name="lock-outline" 
                                        size={moderateScale(20)} 
                                        color="#64748b" 
                                        style={styles.leftIcon} 
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#94a3b8"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            setErrors({ ...errors, password: '' });
                                        }}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoComplete="password"
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <Icon name="eye-off" size={moderateScale(20)} color="#64748b" />
                                        ) : (
                                            <Icon name="eye" size={moderateScale(20)} color="#64748b" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {errors.password ? (
                                    <CustomText preset="caption" style={styles.errorText}>
                                        {errors.password}
                                    </CustomText>
                                ) : null}
                            </View>

                            {/* Root Error */}
                            {errors.root ? (
                                <View style={styles.errorAlert}>
                                    <CustomText style={styles.errorAlertText}>
                                        {errors.root}
                                    </CustomText>
                                </View>
                            ) : null}

                            {/* Login Button */}
                            <CustomButton
                                title="Sign In"
                                onPress={handleLogin}
                                loading={isLoading}
                                size={isTablet ? "lg" : "md"} // Larger button on tablets
                            />

                        </View>

                        {/* Additional Options */}
                        <View style={styles.additionalOptions}>
                            <TouchableOpacity onPress={handleForgotPassword}>
                                <CustomText style={styles.forgotPasswordText}>
                                    Forgot your password?
                                </CustomText>
                            </TouchableOpacity>

                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <CustomText style={styles.dividerText}>or</CustomText>
                                <View style={styles.dividerLine} />
                            </View>

                            <TouchableOpacity
                                style={styles.requestAccessButton}
                                onPress={handleRequestAccess}
                            >
                                <CustomText style={styles.requestAccessText}>
                                    Request access to system
                                </CustomText>
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <CustomText style={styles.footerText}>
                                Protected by enterprise-grade security
                            </CustomText>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: scaleHeight(40),
        paddingHorizontal: isSmallDevice ? scaleWidth(8) : scaleWidth(16),
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    singleCard: {
        width: '100%',
        maxWidth: isTablet ? scaleWidth(600) : scaleWidth(480),
        backgroundColor: '#ffffff',
        borderRadius: scaleWidth(16),
        paddingHorizontal: isSmallDevice ? scaleWidth(20) : scaleWidth(28),
        paddingVertical: isSmallDevice ? scaleHeight(24) : scaleHeight(32),
        shadowColor: '#000',
        shadowOffset: { 
            width: 0, 
            height: scaleHeight(12) 
        },
        shadowOpacity: 0.1,
        shadowRadius: scaleWidth(20),
        elevation: 8,
    },
    logoSection: {
        paddingVertical: scaleHeight(16),
        alignItems: 'center',
        marginBottom: scaleHeight(24),
        backgroundColor: COLORS.logoBackground,
        borderRadius: scaleWidth(16),
    },
    logo: {
        height: isTablet ? scaleHeight(90) : scaleHeight(70),
        width: isTablet ? scaleWidth(220) : scaleWidth(170),
        maxWidth: '80%',
    },
    cardHeader: {
        alignItems: 'center',
        marginBottom: scaleHeight(32),
    },
    welcomeText: {
        fontSize: moderateScale(24),
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: scaleHeight(8),
        textAlign: 'center',
    },
    subtitle: {
        fontSize: moderateScale(16),
        color: '#475569',
        textAlign: 'center',
        lineHeight: moderateScale(22),
    },
    form: {
        gap: scaleHeight(24),
    },
    inputGroup: {
        gap: scaleHeight(8),
    },
    label: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        color: '#334155',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: scaleWidth(12),
        height: isTablet ? scaleHeight(56) : scaleHeight(48),
        paddingHorizontal: scaleWidth(12),
    },
    inputError: {
        borderColor: '#dc2626',
    },
    leftIcon: {
        marginRight: scaleWidth(8),
    },
    textInput: {
        flex: 1,
        fontSize: moderateScale(16),
        color: '#1e293b',
        paddingVertical: scaleHeight(12),
        paddingHorizontal: scaleWidth(4),
    },
    eyeButton: {
        padding: scaleWidth(4),
        marginLeft: scaleWidth(8),
    },
    errorText: {
        fontSize: moderateScale(14),
        color: '#dc2626',
        marginTop: scaleHeight(4),
    },
    errorAlert: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: scaleWidth(12),
        padding: scaleWidth(12),
    },
    errorAlertText: {
        fontSize: moderateScale(14),
        color: '#991b1b',
        textAlign: 'center',
    },
    additionalOptions: {
        marginTop: scaleHeight(32),
        gap: scaleHeight(16),
    },
    forgotPasswordText: {
        fontSize: moderateScale(14),
        color: COLORS.primary,
        textAlign: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: scaleHeight(8),
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#cbd5e1',
    },
    dividerText: {
        marginHorizontal: scaleWidth(8),
        fontSize: moderateScale(14),
        color: '#64748b',
    },
    requestAccessButton: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#f8fafc',
        borderRadius: scaleWidth(12),
        height: isTablet ? scaleHeight(56) : scaleHeight(48),
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestAccessText: {
        fontSize: moderateScale(16),
        color: '#334155',
        fontWeight: '500',
    },
    footer: {
        marginTop: scaleHeight(32),
        alignItems: 'center',
    },
    footerText: {
        fontSize: moderateScale(12),
        color: '#64748b',
        textAlign: 'center',
    },
});

export default LoginScreen;
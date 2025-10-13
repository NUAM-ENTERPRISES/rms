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
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor: number = 0.5) => 
    size + (scaleWidth(size) - size) * factor;

// Device type detection
const isSmallDevice = SCREEN_WIDTH <= 320;
const isTablet = SCREEN_WIDTH >= 768;

type LoginMethod = 'password' | 'otp';
type OtpInputType = 'email' | 'phone';

const LoginScreen = () => {
    const navigation = useNavigation<LoginScreenNavigationProp>();

    // Login method state
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
    const [otpInputType, setOtpInputType] = useState<OtpInputType>('phone');

    // Password login states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // OTP login states
    const [otpEmail, setOtpEmail] = useState('');
    const [otpPhone, setOtpPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Common states
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ 
        email: '', 
        phone: '', 
        password: '', 
        otp: '', 
        root: '' 
    });

    const validatePasswordForm = () => {
        const newErrors = { email: '', phone: '', password: '', otp: '', root: '' };
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

    const validateOtpInput = () => {
        const newErrors = { email: '', phone: '', password: '', otp: '', root: '' };
        let isValid = true;

        if (otpInputType === 'email') {
            if (!otpEmail) {
                newErrors.email = 'Email is required';
                isValid = false;
            } else if (!/\S+@\S+\.\S+/.test(otpEmail)) {
                newErrors.email = 'Please enter a valid email address';
                isValid = false;
            }
        } else {
            if (!otpPhone) {
                newErrors.phone = 'Phone number is required';
                isValid = false;
            } else if (!/^[6-9]\d{9}$/.test(otpPhone)) {
                newErrors.phone = 'Please enter a valid 10-digit phone number';
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const validateOtp = () => {
        const newErrors = { email: '', phone: '', password: '', otp: '', root: '' };
        let isValid = true;

        if (!otp) {
            newErrors.otp = 'OTP is required';
            isValid = false;
        } else if (otp.length !== 6) {
            newErrors.otp = 'OTP must be 6 digits';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handlePasswordLogin = async () => {
        if (!validatePasswordForm()) return;

        setIsLoading(true);

        try {
            // TODO: Replace with actual API call
            console.log('Password login:', { email, password });
   
            navigation.replace('Home');
        } catch (error) {
            setErrors({ ...errors, root: 'Invalid email or password' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOtp = async () => {
        if (!validateOtpInput()) return;

        setIsLoading(true);

        try {
            // TODO: Replace with actual API call to send OTP
            const identifier = otpInputType === 'email' ? otpEmail : otpPhone;
            console.log(`Sending OTP to ${otpInputType}:`, identifier);
            
            
            setOtpSent(true);
            setCountdown(60);
            Alert.alert(
                'Success', 
                `OTP sent to your ${otpInputType === 'email' ? 'email' : 'phone number'}`
            );

            // Start countdown
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error) {
            setErrors({ ...errors, root: 'Failed to send OTP. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!validateOtp()) return;

        setIsLoading(true);

        try {
            // TODO: Replace with actual API call to verify OTP
            const identifier = otpInputType === 'email' ? otpEmail : otpPhone;
            console.log('Verifying OTP:', { type: otpInputType, identifier, otp });
       
            navigation.replace('Home');
        } catch (error) {
            setErrors({ ...errors, root: 'Invalid OTP. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = () => {
        setOtp('');
        setErrors({ email: '', phone: '', password: '', otp: '', root: '' });
        handleSendOtp();
    };

    const handleForgotPassword = () => {
        Alert.alert('Forgot Password', 'Password reset feature coming soon!');
    };

    const handleRequestAccess = () => {
        Alert.alert('Request Access', 'Access request feature coming soon!');
    };

    const switchLoginMethod = (method: LoginMethod) => {
        setLoginMethod(method);
        // Reset states when switching
        setEmail('');
        setPassword('');
        setOtpEmail('');
        setOtpPhone('');
        setOtp('');
        setOtpSent(false);
        setCountdown(0);
        setErrors({ email: '', phone: '', password: '', otp: '', root: '' });
    };

    const switchOtpInputType = (type: OtpInputType) => {
        setOtpInputType(type);
        setOtpEmail('');
        setOtpPhone('');
        setOtp('');
        setOtpSent(false);
        setCountdown(0);
        setErrors({ email: '', phone: '', password: '', otp: '', root: '' });
    };

    const formatPhoneNumber = (text: string) => {
        // Remove all non-numeric characters
        const cleaned = text.replace(/\D/g, '');
        // Limit to 10 digits
        return cleaned.slice(0, 10);
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

                        {/* Login Method Toggle */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.tab,
                                    loginMethod === 'password' && styles.activeTab
                                ]}
                                onPress={() => switchLoginMethod('password')}
                            >
                                <Icon 
                                    name="lock-outline" 
                                    size={moderateScale(18)} 
                                    color={loginMethod === 'password' ? COLORS.primary : '#64748b'}
                                />
                                <CustomText 
                                    style={[
                                        styles.tabText,
                                        loginMethod === 'password' && styles.activeTabText
                                    ]}
                                >
                                    Password
                                </CustomText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.tab,
                                    loginMethod === 'otp' && styles.activeTab
                                ]}
                                onPress={() => switchLoginMethod('otp')}
                            >
                                <Icon 
                                    name="message-outline" 
                                    size={moderateScale(18)} 
                                    color={loginMethod === 'otp' ? COLORS.primary : '#64748b'}
                                />
                                <CustomText 
                                    style={[
                                        styles.tabText,
                                        loginMethod === 'otp' && styles.activeTabText
                                    ]}
                                >
                                    OTP
                                </CustomText>
                            </TouchableOpacity>
                        </View>

                        {/* Password Login Form */}
                        {loginMethod === 'password' && (
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
                                    onPress={handlePasswordLogin}
                                    loading={isLoading}
                                    size={isTablet ? "lg" : "md"}
                                />

                                {/* Forgot Password */}
                                <TouchableOpacity onPress={handleForgotPassword}>
                                    <CustomText style={styles.forgotPasswordText}>
                                        Forgot your password?
                                    </CustomText>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* OTP Login Form */}
                        {loginMethod === 'otp' && (
                            <View style={styles.form}>
                                {!otpSent ? (
                                    <>
                                        {/* OTP Input Type Toggle */}
                                        <View style={styles.otpTypeContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.otpTypeButton,
                                                    otpInputType === 'phone' && styles.activeOtpType
                                                ]}
                                                onPress={() => switchOtpInputType('phone')}
                                            >
                                                <Icon 
                                                    name="phone-outline" 
                                                    size={moderateScale(16)} 
                                                    color={otpInputType === 'phone' ? '#ffffff' : '#64748b'}
                                                />
                                                <CustomText 
                                                    style={[
                                                        styles.otpTypeText,
                                                        otpInputType === 'phone' && styles.activeOtpTypeText
                                                    ]}
                                                >
                                                    Phone
                                                </CustomText>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.otpTypeButton,
                                                    otpInputType === 'email' && styles.activeOtpType
                                                ]}
                                                onPress={() => switchOtpInputType('email')}
                                            >
                                                <Icon 
                                                    name="email-outline" 
                                                    size={moderateScale(16)} 
                                                    color={otpInputType === 'email' ? '#ffffff' : '#64748b'}
                                                />
                                                <CustomText 
                                                    style={[
                                                        styles.otpTypeText,
                                                        otpInputType === 'email' && styles.activeOtpTypeText
                                                    ]}
                                                >
                                                    Email
                                                </CustomText>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Phone Number Input */}
                                        {otpInputType === 'phone' && (
                                            <View style={styles.inputGroup}>
                                                <CustomText preset="bodyMedium" style={styles.label}>
                                                    Phone number
                                                </CustomText>
                                                <View style={[
                                                    styles.inputWrapper,
                                                    errors.phone && styles.inputError
                                                ]}>
                                                    <View style={styles.phonePrefix}>
                                                        <CustomText style={styles.phonePrefixText}>+91</CustomText>
                                                    </View>
                                                    <Icon 
                                                        name="phone-outline" 
                                                        size={moderateScale(20)} 
                                                        color="#64748b" 
                                                        style={styles.leftIcon} 
                                                    />
                                                    <TextInput
                                                        style={styles.textInput}
                                                        placeholder="Enter 10-digit number"
                                                        placeholderTextColor="#94a3b8"
                                                        value={otpPhone}
                                                        onChangeText={(text) => {
                                                            const formatted = formatPhoneNumber(text);
                                                            setOtpPhone(formatted);
                                                            setErrors({ ...errors, phone: '' });
                                                        }}
                                                        keyboardType="phone-pad"
                                                        maxLength={10}
                                                    />
                                                </View>
                                                {errors.phone ? (
                                                    <CustomText preset="caption" style={styles.errorText}>
                                                        {errors.phone}
                                                    </CustomText>
                                                ) : null}
                                            </View>
                                        )}

                                        {/* Email Input */}
                                        {otpInputType === 'email' && (
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
                                                        value={otpEmail}
                                                        onChangeText={(text) => {
                                                            setOtpEmail(text);
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
                                        )}

                                        {/* Root Error */}
                                        {errors.root ? (
                                            <View style={styles.errorAlert}>
                                                <CustomText style={styles.errorAlertText}>
                                                    {errors.root}
                                                </CustomText>
                                            </View>
                                        ) : null}

                                        {/* Send OTP Button */}
                                        <CustomButton
                                            title="Send OTP"
                                            onPress={handleSendOtp}
                                            loading={isLoading}
                                            size={isTablet ? "lg" : "md"}
                                        />

                                        <View style={styles.otpInfo}>
                                            <Icon name="information-outline" size={moderateScale(16)} color="#64748b" />
                                            <CustomText style={styles.otpInfoText}>
                                                We'll send a 6-digit code to your {otpInputType}
                                            </CustomText>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        {/* OTP Input */}
                                        <View style={styles.inputGroup}>
                                            <CustomText preset="bodyMedium" style={styles.label}>
                                                Enter OTP
                                            </CustomText>
                                            <View style={[
                                                styles.inputWrapper,
                                                errors.otp && styles.inputError
                                            ]}>
                                                <Icon 
                                                    name="shield-key-outline" 
                                                    size={moderateScale(20)} 
                                                    color="#64748b" 
                                                    style={styles.leftIcon} 
                                                />
                                                <TextInput
                                                    style={styles.textInput}
                                                    placeholder="Enter 6-digit code"
                                                    placeholderTextColor="#94a3b8"
                                                    value={otp}
                                                    onChangeText={(text) => {
                                                        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                                                        setOtp(cleaned);
                                                        setErrors({ ...errors, otp: '' });
                                                    }}
                                                    keyboardType="number-pad"
                                                    maxLength={6}
                                                />
                                            </View>
                                            {errors.otp ? (
                                                <CustomText preset="caption" style={styles.errorText}>
                                                    {errors.otp}
                                                </CustomText>
                                            ) : null}
                                            <CustomText style={styles.otpSentText}>
                                                OTP sent to {otpInputType === 'email' ? otpEmail : `+91 ${otpPhone}`}
                                            </CustomText>
                                        </View>

                                        {/* Root Error */}
                                        {errors.root ? (
                                            <View style={styles.errorAlert}>
                                                <CustomText style={styles.errorAlertText}>
                                                    {errors.root}
                                                </CustomText>
                                            </View>
                                        ) : null}

                                        {/* Verify OTP Button */}
                                        <CustomButton
                                            title="Verify OTP"
                                            onPress={handleVerifyOtp}
                                            loading={isLoading}
                                            size={isTablet ? "lg" : "md"}
                                        />

                                        {/* Resend OTP */}
                                        <View style={styles.resendContainer}>
                                            {countdown > 0 ? (
                                                <CustomText style={styles.countdownText}>
                                                    Resend OTP in {countdown}s
                                                </CustomText>
                                            ) : (
                                                <TouchableOpacity onPress={handleResendOtp}>
                                                    <CustomText style={styles.resendText}>
                                                        Didn't receive OTP? Resend
                                                    </CustomText>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </>
                                )}
                            </View>
                        )}

                        {/* Additional Options */}
                        <View style={styles.additionalOptions}>
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
        marginBottom: scaleHeight(24),
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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: scaleWidth(12),
        padding: scaleWidth(4),
        marginBottom: scaleHeight(24),
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scaleHeight(12),
        borderRadius: scaleWidth(8),
        gap: scaleWidth(6),
    },
    activeTab: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: moderateScale(15),
        color: '#64748b',
        fontWeight: '500',
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    otpTypeContainer: {
        flexDirection: 'row',
        gap: scaleWidth(12),
    },
    otpTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scaleHeight(12),
        borderRadius: scaleWidth(10),
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        gap: scaleWidth(6),
    },
    activeOtpType: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    otpTypeText: {
        fontSize: moderateScale(14),
        color: '#64748b',
        fontWeight: '500',
    },
    activeOtpTypeText: {
        color: '#ffffff',
        fontWeight: '600',
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
    phonePrefix: {
        paddingRight: scaleWidth(8),
        borderRightWidth: 1,
        borderRightColor: '#cbd5e1',
        marginRight: scaleWidth(8),
    },
    phonePrefixText: {
        fontSize: moderateScale(16),
        color: '#475569',
        fontWeight: '500',
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
    otpInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scaleWidth(6),
        paddingHorizontal: scaleWidth(12),
    },
    otpInfoText: {
        fontSize: moderateScale(13),
        color: '#64748b',
        textAlign: 'center',
    },
    otpSentText: {
        fontSize: moderateScale(13),
        color: '#059669',
        marginTop: scaleHeight(4),
    },
    resendContainer: {
        alignItems: 'center',
    },
    resendText: {
        fontSize: moderateScale(14),
        color: COLORS.primary,
        textAlign: 'center',
    },
    countdownText: {
        fontSize: moderateScale(14),
        color: '#64748b',
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
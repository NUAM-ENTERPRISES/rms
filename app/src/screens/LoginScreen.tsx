import React, { useState, useRef, useEffect } from 'react';
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
    Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import CustomText from '@/components/CustomText';
import { COLORS } from '@/constants/colors';
import { RootStackParamList } from '@/types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomButton from '@/components/CustomButton';
import { useLoginMutation } from '@/features/auth/authApi';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CountryPicker from '@/components/CountryPicker';

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
type OtpInputType = 'whatsapp' | 'phone';

const LoginScreen = () => {

    const navigation = useNavigation<LoginScreenNavigationProp>();
    const [login, { isLoading: isLoginLoading }] = useLoginMutation();

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const floatingAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // Login method state
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
    const [otpInputType, setOtpInputType] = useState<OtpInputType>('whatsapp');

    // Password login states
    const [selectedCountry, setSelectedCountry] = useState<{ name: string; code: string; dial_code: string; flag?: string } | null>({ name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳' });
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // OTP login states
    const [otpPhone, setOtpPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    // Common states
    const [countdown, setCountdown] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ phone: '', password: '', otp: '', root: '' });

    // Initialize animations
    useEffect(() => {
        // Main entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        // Floating animation for background elements
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatingAnim, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Subtle pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.02,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotation animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 20000,
                useNativeDriver: true,
            })
        ).start();

        // Shimmer animation
        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 2500,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const validatePasswordForm = () => {
        const newErrors = { phone: '', password: '', otp: '', root: '' };
        let isValid = true;

        if (!otpPhone) {
            newErrors.phone = 'Phone number is required';
            isValid = false;
        } else if (!/^[6-9]\d{9}$/.test(otpPhone)) {
            newErrors.phone = 'Please enter a valid 10-digit phone number';
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
        const newErrors = { phone: '', password: '', otp: '', root: '' };
        let isValid = true;

        if (!otpPhone) {
            newErrors.phone = 'Phone number is required';
            isValid = false;
        } else if (!/^[6-9]\d{9}$/.test(otpPhone)) {
            newErrors.phone = 'Please enter a valid 10-digit phone number';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const validateOtp = () => {
        const newErrors = { phone: '', password: '', otp: '', root: '' };
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

    const handleSendOtp = async () => {
        if (!validateOtpInput()) return;

        setIsLoading(true);
        try {
            const identifier = `${selectedCountry?.dial_code ?? '+91'} ${otpPhone}`;
            console.log('Sending OTP via WhatsApp to:', identifier);

            setOtpSent(true);
            setCountdown(60);
            Alert.alert('Success', `OTP sent via WhatsApp to ${identifier}`);

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

    const handlePasswordLogin = async () => {
        if (!validatePasswordForm()) return;
        setIsLoading(true);
        try {
            const loginData = {
                countryCode: selectedCountry?.dial_code || '+91',
                mobileNumber: otpPhone,
                password: password,
            };
            const result = await login(loginData).unwrap();
        } catch (error: any) {
            const errorMessage = error?.data?.message ||
                error?.message ||
                'Invalid phone number or password';
            setErrors({ ...errors, root: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!validateOtp()) return;

        setIsLoading(true);

        try {
            const identifier = otpPhone;
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
        setErrors({ phone: '', password: '', otp: '', root: '' });
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
        setPassword('');
        setOtpPhone('');
        setOtp('');
        setOtpSent(false);
        setCountdown(0);
        setErrors({ phone: '', password: '', otp: '', root: '' });
    };

    const switchOtpInputType = (type: OtpInputType) => {
        setOtpInputType(type);
        setOtpPhone('');
        setOtp('');
        setOtpSent(false);
        setCountdown(0);
        setErrors({ phone: '', password: '', otp: '', root: '' });
    };

    const formatPhoneNumber = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        return cleaned.slice(0, 10);
    };

    const floatingInterpolate = floatingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -12],
    });

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
    });

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            style={styles.gradientContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Enhanced floating orbs */}
            <Animated.View style={[styles.floatingOrb, styles.orb1, { 
                transform: [
                    { translateY: floatingInterpolate },
                    { rotate: rotateInterpolate }
                ] 
            }]} />
            <Animated.View style={[styles.floatingOrb, styles.orb2, { 
                transform: [
                    { translateY: floatingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 18],
                    }) },
                    { rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-360deg'],
                    }) }
                ] 
            }]} />
            <Animated.View style={[styles.floatingOrb, styles.orb3, { 
                transform: [{ translateY: floatingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
                }) }] 
            }]} />
            <Animated.View style={[styles.floatingOrb, styles.orb4, { 
                transform: [{ translateY: floatingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 15],
                }) }] 
            }]} />

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
                        <Animated.View 
                            style={[
                                styles.singleCard,
                                {
                                    opacity: fadeAnim,
                                    transform: [
                                        { translateY: slideAnim },
                                        { scale: pulseAnim }
                                    ]
                                }
                            ]}
                        >
                            {/* Enhanced Logo Section */}
                            <View style={styles.logoSection}>
                                {/* Shimmer effect */}
                                <Animated.View style={[styles.shimmerOverlay, {
                                    transform: [{ translateX: shimmerTranslate }]
                                }]} />
                                
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

                            {/* Enhanced Login Method Toggle */}
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.tab,
                                        loginMethod === 'password' && styles.activeTab
                                    ]}
                                    onPress={() => switchLoginMethod('password')}
                                    activeOpacity={0.8}
                                >
                                    <Icon
                                        name="lock-outline"
                                        size={moderateScale(20)}
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
                                    activeOpacity={0.8}
                                >
                                    <Icon
                                        name="message-outline"
                                        size={moderateScale(20)}
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
                                    {/* Phone Number */}
                                    <View style={styles.inputGroup}>
                                        <CustomText preset="bodyMedium" style={styles.label}>
                                            Phone number
                                        </CustomText>
                                        <View style={[
                                            styles.inputWrapper,
                                            errors.phone && styles.inputError
                                        ]}>
                                            <View style={styles.phonePrefix}>
                                                <CountryPicker
                                                    value={selectedCountry}
                                                    onSelect={(c) => setSelectedCountry(c)}
                                                />
                                            </View>
                                            <Icon
                                                name="phone-outline"
                                                size={moderateScale(20)}
                                                color="#64748b"
                                                style={styles.leftIcon}
                                            />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="e.g. 9876543210"
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
                                            <Icon name="alert-circle" size={moderateScale(18)} color="#dc2626" />
                                            <CustomText style={styles.errorAlertText}>
                                                {errors.root}
                                            </CustomText>
                                        </View>
                                    ) : null}

                                    {/* Login Button */}
                                    <CustomButton
                                        title="Sign In"
                                        onPress={handlePasswordLogin}
                                        loading={isLoading || isLoginLoading}
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
                                            <View style={styles.inputGroup}>
                                                <CustomText preset="bodyMedium" style={styles.label}>
                                                    Phone number (WhatsApp)
                                                </CustomText>
                                                <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                                                    <View style={styles.phonePrefix}>
                                                        <CountryPicker value={selectedCountry} onSelect={(c) => setSelectedCountry(c)} />
                                                    </View>
                                                    <Icon name="phone-outline" size={moderateScale(20)} color="#64748b" style={styles.leftIcon} />
                                                    <TextInput
                                                        style={styles.textInput}
                                                        placeholder="e.g. 9876543210"
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
                                                {errors.phone ? <CustomText preset="caption" style={styles.errorText}>{errors.phone}</CustomText> : null}
                                            </View>

                                            {errors.root ? (
                                                <View style={styles.errorAlert}>
                                                    <Icon name="alert-circle" size={moderateScale(18)} color="#dc2626" />
                                                    <CustomText style={styles.errorAlertText}>{errors.root}</CustomText>
                                                </View>
                                            ) : null}

                                            <CustomButton title="Send OTP via WhatsApp" onPress={handleSendOtp} loading={isLoading} size={isTablet ? 'lg' : 'md'} />

                                            <View style={styles.otpInfo}>
                                                <Icon name="information-outline" size={moderateScale(16)} color="#64748b" />
                                                <CustomText style={styles.otpInfoText}>
                                                    We'll send a 6-digit code via WhatsApp
                                                </CustomText>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <View style={styles.inputGroup}>
                                                <CustomText preset="bodyMedium" style={styles.label}>Enter OTP</CustomText>
                                                <View style={[styles.inputWrapper, errors.otp && styles.inputError]}>
                                                    <Icon name="shield-key-outline" size={moderateScale(20)} color="#64748b" style={styles.leftIcon} />
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
                                                {errors.otp ? <CustomText preset="caption" style={styles.errorText}>{errors.otp}</CustomText> : null}
                                                <View style={styles.otpSentContainer}>
                                                    <Icon name="check-circle" size={moderateScale(16)} color="#059669" />
                                                    <CustomText style={styles.otpSentText}>
                                                        {`OTP sent via WhatsApp to ${selectedCountry?.dial_code ?? '+91'} ${otpPhone}`}
                                                    </CustomText>
                                                </View>
                                            </View>

                                            {errors.root ? (
                                                <View style={styles.errorAlert}>
                                                    <Icon name="alert-circle" size={moderateScale(18)} color="#dc2626" />
                                                    <CustomText style={styles.errorAlertText}>{errors.root}</CustomText>
                                                </View>
                                            ) : null}

                                            <CustomButton title="Verify OTP" onPress={handleVerifyOtp} loading={isLoading} size={isTablet ? 'lg' : 'md'} />

                                            <View style={styles.resendContainer}>
                                                {countdown > 0 ? (
                                                    <View style={styles.countdownContainer}>
                                                        <Icon name="clock-outline" size={moderateScale(16)} color="#64748b" />
                                                        <CustomText style={styles.countdownText}>Resend OTP in {countdown}s</CustomText>
                                                    </View>
                                                ) : (
                                                    <TouchableOpacity onPress={handleResendOtp} style={styles.resendButton}>
                                                        <Icon name="refresh" size={moderateScale(16)} color={COLORS.primary} />
                                                        <CustomText style={styles.resendText}>Didn't receive OTP? Resend</CustomText>
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
                                    activeOpacity={0.8}
                                >
                                    <Icon name="account-plus-outline" size={moderateScale(20)} color="#334155" />
                                    <CustomText style={styles.requestAccessText}>
                                        Request access to system
                                    </CustomText>
                                </TouchableOpacity>
                            </View>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Icon name="shield-check" size={moderateScale(14)} color="#64748b" />
                                <CustomText style={styles.footerText}>
                                    Protected by enterprise-grade security
                                </CustomText>
                            </View>
                        </Animated.View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    // Enhanced floating orbs
    floatingOrb: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 1000,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    orb1: {
        width: 180,
        height: 180,
        top: '8%',
        left: '-10%',
    },
    orb2: {
        width: 220,
        height: 220,
        bottom: '5%',
        right: '-15%',
    },
    orb3: {
        width: 120,
        height: 120,
        top: '25%',
        right: '5%',
    },
    orb4: {
        width: 150,
        height: 150,
        bottom: '40%',
        left: '8%',
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
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: scaleWidth(28),
        paddingHorizontal: isSmallDevice ? scaleWidth(24) : scaleWidth(32),
        paddingVertical: isSmallDevice ? scaleHeight(32) : scaleHeight(40),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: scaleHeight(20)
        },
        shadowOpacity: 0.3,
        shadowRadius: scaleWidth(35),
        elevation: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    logoSection: {
        paddingVertical: scaleHeight(20),
        alignItems: 'center',
        marginBottom: scaleHeight(28),
        backgroundColor: COLORS.logoBackground,
        borderRadius: scaleWidth(20),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: scaleHeight(8)
        },
        shadowOpacity: 0.15,
        shadowRadius: scaleWidth(12),
        elevation: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        overflow: 'hidden',
        position: 'relative',
    },
    shimmerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH * 0.25,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        transform: [{ skewX: '-20deg' }],
    },
    logo: {
        height: isTablet ? scaleHeight(90) : scaleHeight(70),
        width: isTablet ? scaleWidth(220) : scaleWidth(170),
        maxWidth: '80%',
    },
    cardHeader: {
        alignItems: 'center',
        marginBottom: scaleHeight(28),
    },
    welcomeText: {
        fontSize: moderateScale(30),
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: scaleHeight(10),
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.08)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        letterSpacing: 0.8,
    },
    subtitle: {
        fontSize: moderateScale(16),
        color: '#475569',
        textAlign: 'center',
        lineHeight: moderateScale(22),
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(241, 245, 249, 0.8)',
        borderRadius: scaleWidth(18),
        padding: scaleWidth(6),
        marginBottom: scaleHeight(28),
        borderWidth: 1.5,
        borderColor: 'rgba(203, 213, 225, 0.5)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: scaleHeight(2)
        },
        shadowOpacity: 0.08,
        shadowRadius: scaleWidth(4),
        elevation: 3,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scaleHeight(14),
        borderRadius: scaleWidth(12),
        gap: scaleWidth(8),
    },
    activeTab: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleHeight(4) },
        shadowOpacity: 0.12,
        shadowRadius: scaleWidth(8),
        elevation: 6,
        borderWidth: 1.5,
        borderColor: 'rgba(102, 126, 234, 0.2)',
    },
    tabText: {
        fontSize: moderateScale(15),
        color: '#64748b',
        fontWeight: '600',
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    form: {
        gap: scaleHeight(24),
    },
    inputGroup: {
        gap: scaleHeight(10),
    },
    label: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: '#334155',
        letterSpacing: 0.3,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: scaleWidth(16),
        height: isTablet ? scaleHeight(60) : scaleHeight(54),
        paddingHorizontal: scaleWidth(16),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: scaleHeight(2)
        },
        shadowOpacity: 0.06,
        shadowRadius: scaleWidth(6),
        elevation: 3,
    },
    inputError: {
        borderColor: '#dc2626',
        backgroundColor: '#fef2f2',
    },
    phonePrefix: {
        paddingRight: scaleWidth(8),
        borderRightWidth: 1,
        borderRightColor: '#cbd5e1',
        marginRight: scaleWidth(8),
    },
    leftIcon: {
        marginRight: scaleWidth(10),
    },
    textInput: {
        flex: 1,
        fontSize: moderateScale(16),
        color: '#1e293b',
        paddingVertical: scaleHeight(12),
        paddingHorizontal: scaleWidth(4),
        fontWeight: '500',
    },
    eyeButton: {
        padding: scaleWidth(6),
        marginLeft: scaleWidth(8),
    },
    errorText: {
        fontSize: moderateScale(13),
        color: '#dc2626',
        marginTop: scaleHeight(4),
        fontWeight: '500',
    },
    errorAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleWidth(8),
        backgroundColor: '#fef2f2',
        borderWidth: 1.5,
        borderColor: '#fecaca',
        borderRadius: scaleWidth(14),
        padding: scaleWidth(14),
        shadowColor: '#dc2626',
        shadowOffset: {
            width: 0,
            height: scaleHeight(2)
        },
        shadowOpacity: 0.1,
        shadowRadius: scaleWidth(4),
        elevation: 2,
    },
    errorAlertText: {
        flex: 1,
        fontSize: moderateScale(14),
        color: '#991b1b',
        fontWeight: '500',
    },
    otpInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scaleWidth(8),
        paddingHorizontal: scaleWidth(12),
        paddingVertical: scaleHeight(10),
        backgroundColor: 'rgba(241, 245, 249, 0.6)',
        borderRadius: scaleWidth(12),
    },
    otpInfoText: {
        fontSize: moderateScale(13),
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '500',
    },
    otpSentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleWidth(6),
        marginTop: scaleHeight(6),
    },
    otpSentText: {
        flex: 1,
        fontSize: moderateScale(13),
        color: '#059669',
        fontWeight: '500',
    },
    resendContainer: {
        alignItems: 'center',
    },
    countdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleWidth(6),
        paddingHorizontal: scaleWidth(16),
        paddingVertical: scaleHeight(10),
        backgroundColor: 'rgba(241, 245, 249, 0.6)',
        borderRadius: scaleWidth(12),
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleWidth(6),
        paddingHorizontal: scaleWidth(16),
        paddingVertical: scaleHeight(10),
    },
    resendText: {
        fontSize: moderateScale(14),
        color: COLORS.primary,
        textAlign: 'center',
        fontWeight: '600',
    },
    countdownText: {
        fontSize: moderateScale(14),
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '500',
    },
    additionalOptions: {
        marginTop: scaleHeight(32),
        gap: scaleHeight(16),
    },
    forgotPasswordText: {
        fontSize: moderateScale(14),
        color: COLORS.primary,
        textAlign: 'center',
        fontWeight: '600',
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
        marginHorizontal: scaleWidth(12),
        fontSize: moderateScale(14),
        color: '#64748b',
        fontWeight: '500',
    },
    requestAccessButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scaleWidth(8),
        borderWidth: 2,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        borderRadius: scaleWidth(16),
        height: isTablet ? scaleHeight(56) : scaleHeight(52),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: scaleHeight(4)
        },
        shadowOpacity: 0.08,
        shadowRadius: scaleWidth(8),
        elevation: 4,
    },
    requestAccessText: {
        fontSize: moderateScale(16),
        color: '#334155',
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scaleWidth(6),
        marginTop: scaleHeight(32),
        paddingTop: scaleHeight(24),
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    footerText: {
        fontSize: moderateScale(12),
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '500',
    },
});

export default LoginScreen;
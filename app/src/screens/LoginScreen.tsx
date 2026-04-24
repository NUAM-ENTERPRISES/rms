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
import CustomText from '@/components/ui/CustomText';
import { COLORS } from '@/constants/colors';
import { RootStackParamList } from '@/types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomButton from '@/components/ui/CustomButton';
import { useLoginMutation } from '@/features/auth/authApi';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CountryPicker from '@/components/ui/CountryPicker';

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
    const [phoneNumber, setPhoneNumber] = useState('');
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

        if (!phoneNumber) {
            newErrors.phone = 'Phone number is required';
            isValid = false;
        } else if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
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
        setErrors({ phone: '', password: '', otp: '', root: '' });

        try {
            const loginData = {
                countryCode: selectedCountry?.dial_code || '+91',
                mobileNumber: phoneNumber,
                password: password,
            };

            const result = await login(loginData).unwrap();

            if (result?.success) {
                // Note: AuthNavigator will switch to RoleBasedNavigator
                // when isAuthenticated is updated in Redux.
                console.log('✅ Login successful');
            } else {
                setErrors({ ...errors, root: result?.message || 'Login failed. Please try again.' });
            }
        } catch (error: any) {
            const errorMessage =
                error?.data?.message ||
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

            // Note: AuthNavigator will switch to RoleBasedNavigator
            // when isAuthenticated is updated in Redux.
            console.log('✅ OTP Verification successful');
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
        navigation.navigate('ForgotPassword');
    };

    // const handleRequestAccess = () => {
    //     Alert.alert('Request Access', 'Access request feature coming soon!');
    // };

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
                            {/* <View style={styles.tabContainer}>
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
                            </View> */}

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
                                                value={phoneNumber}
                                                onChangeText={(text) => {
                                                    const formatted = formatPhoneNumber(text);
                                                    setPhoneNumber(formatted);
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
                            {/* {loginMethod === 'otp' && (
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
                            )} */}

                            {/* Additional Options */}
                            {/* <View style={styles.additionalOptions}>
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
                            </View> */}

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
        width: '95%',
        maxWidth: isTablet ? 520 : 440,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: moderateScale(24),
        paddingHorizontal: moderateScale(24),
        paddingVertical: moderateScale(32),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        alignSelf: 'center',
    },
    logoSection: {
        paddingVertical: moderateScale(16),
        alignItems: 'center',
        marginBottom: moderateScale(20),
        backgroundColor: COLORS.logoBackground || 'transparent',
        borderRadius: moderateScale(16),
        overflow: 'hidden',
        position: 'relative',
    },
    shimmerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH * 0.4,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        transform: [{ skewX: '-25deg' }],
    },
    logo: {
        height: isTablet ? 80 : 60,
        width: isTablet ? 200 : 150,
        maxWidth: '90%',
    },
    cardHeader: {
        alignItems: 'center',
        marginBottom: moderateScale(24),
    },
    welcomeText: {
        fontSize: moderateScale(26),
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: moderateScale(6),
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: moderateScale(14),
        color: '#64748b',
        textAlign: 'center',
        lineHeight: moderateScale(20),
        fontWeight: '400',
    },
    form: {
        width: '100%',
        minHeight: moderateScale(380),
        justifyContent: 'space-between',
        paddingVertical: moderateScale(12),
    },
    inputGroup: {
        marginBottom: moderateScale(20),
        width: '100%',
    },
    label: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: '#475569',
        marginBottom: moderateScale(6),
        marginLeft: moderateScale(4),
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: moderateScale(12),
        height: moderateScale(54),
        paddingRight: moderateScale(12),
        width: '100%',
        overflow: 'hidden',
    },
    inputError: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    phonePrefix: {
        height: '100%',
        paddingLeft: moderateScale(12),
        paddingRight: moderateScale(8),
        borderRightWidth: 1,
        borderRightColor: '#cbd5e1',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: moderateScale(70),
    },
    leftIcon: {
        marginLeft: moderateScale(12),
        marginRight: moderateScale(8),
    },
    textInput: {
        flex: 1,
        height: '100%',
        fontSize: moderateScale(15),
        color: '#1e293b',
        paddingVertical: 0,
        fontWeight: '500',
        paddingLeft: moderateScale(4),
    },
    eyeButton: {
        padding: moderateScale(4),
    },
    errorText: {
        fontSize: moderateScale(12),
        color: '#ef4444',
        marginTop: moderateScale(4),
        marginLeft: moderateScale(4),
        fontWeight: '500',
    },
    errorAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: moderateScale(10),
        padding: moderateScale(12),
        marginBottom: moderateScale(16),
    },
    errorAlertText: {
        flex: 1,
        fontSize: moderateScale(13),
        color: '#b91c1c',
        marginLeft: moderateScale(8),
    },
    forgotPasswordText: {
        fontSize: moderateScale(13),
        color: COLORS.primary,
        textAlign: 'right',
        fontWeight: '600',
        marginTop: moderateScale(10),
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: moderateScale(24),
        paddingTop: moderateScale(20),
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    footerText: {
        fontSize: moderateScale(11),
        color: '#94a3b8',
        marginLeft: moderateScale(6),
        fontWeight: '500',
    },
});

export default LoginScreen;
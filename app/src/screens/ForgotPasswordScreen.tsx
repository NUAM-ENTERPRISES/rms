import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TextInput,
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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CountryPicker from '@/components/ui/CountryPicker';
import { useForgotPasswordMutation } from '@/features/auth/authApi';

type ForgotPasswordNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor: number = 0.5) =>
    size + (scaleWidth(size) - size) * factor;

const isTablet = SCREEN_WIDTH >= 768;

const ForgotPasswordScreen = () => {
    const navigation = useNavigation<ForgotPasswordNavigationProp>();

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const floatingAnim = useRef(new Animated.Value(0)).current;

    // States
    const [selectedCountry, setSelectedCountry] = useState<{ name: string; code: string; dial_code: string; flag?: string } | null>({ name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳' });
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [errors, setErrors] = useState({ phone: '', otp: '', root: '' });

    const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
                Animated.timing(floatingAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const handleSendOtp = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            setErrors({ ...errors, phone: 'Please enter a valid phone number' });
            return;
        }

        try {
            const response = await forgotPassword({
                countryCode: selectedCountry?.dial_code || '+91',
                mobileNumber: phoneNumber,
            }).unwrap();

            if (response.success) {
                setOtpSent(true);
                setCountdown(60);
                Alert.alert('OTP Sent', `A 6-digit OTP has been sent via WhatsApp.`);
            }
        } catch (error: any) {
            console.error('Forgot password error:', error);
            const message = error.data?.message || 'Failed to send OTP. Please try again.';
            setErrors({ ...errors, phone: message });
            Alert.alert('Error', message);
        }
    };

    const handleVerifyOtp = () => {
        if (otp.length !== 6) {
            setErrors({ ...errors, otp: 'Please enter a valid 6-digit OTP' });
            return;
        }

        // We verify the OTP on the next screen during password reset
        navigation.navigate('ResetPassword', { 
            phone: phoneNumber, 
            countryCode: selectedCountry?.dial_code || '+91',
            otp: otp
        });
    };

    const floatingInterpolate = floatingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -15],
    });

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            style={styles.gradientContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <Animated.View style={[styles.floatingOrb, styles.orb1, { transform: [{ translateY: floatingInterpolate }] }]} />
            <Animated.View style={[styles.floatingOrb, styles.orb2, { transform: [{ translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>

                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.header}>
                            <Icon name="lock-reset" size={moderScale(50)} color={COLORS.primary} />
                            <CustomText preset="heading" style={styles.title}>
                                {otpSent ? 'Verify OTP' : 'Forgot Password?'}
                            </CustomText>
                            <CustomText style={styles.subtitle}>
                                {otpSent 
                                    ? `Enter the 6-digit code sent to ${selectedCountry?.dial_code} ${phoneNumber}`
                                    : "No worries! Enter your phone number and we'll send you an OTP via WhatsApp to reset it."}
                            </CustomText>
                        </View>

                        <View style={styles.form}>
                            {!otpSent ? (
                                <View style={styles.inputGroup}>
                                    <CustomText preset="bodyMedium" style={styles.label}>Phone Number</CustomText>
                                    <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                                        <View style={styles.phonePrefix}>
                                            <CountryPicker
                                                value={selectedCountry}
                                                onSelect={(c) => setSelectedCountry(c)}
                                            />
                                        </View>
                                        <Icon name="phone" size={20} color="#64748b" style={styles.leftIcon} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="9876543210"
                                            placeholderTextColor="#94a3b8"
                                            value={phoneNumber}
                                            onChangeText={(text) => {
                                                setPhoneNumber(text.replace(/[^0-9]/g, '').slice(0, 10));
                                                setErrors({ ...errors, phone: '' });
                                            }}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                    {errors.phone ? <CustomText style={styles.errorText}>{errors.phone}</CustomText> : null}
                                    
                                    <View style={styles.buttonContainer}>
                                        <TouchableOpacity
                                            style={[styles.whatsappButton, isLoading && styles.disabledButton]}
                                            onPress={handleSendOtp}
                                            disabled={isLoading}
                                            activeOpacity={0.8}
                                        >
                                            <Icon name="whatsapp" size={24} color="#fff" style={styles.buttonIcon} />
                                            <CustomText style={styles.whatsappButtonText}>
                                                {isLoading ? 'Sending...' : 'Send OTP via WhatsApp'}
                                            </CustomText>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.inputGroup}>
                                    <CustomText preset="bodyMedium" style={styles.label}>Enter 6-Digit OTP</CustomText>
                                    <View style={[styles.inputWrapper, errors.otp && styles.inputError]}>
                                        <Icon name="shield-check-outline" size={20} color="#64748b" style={styles.leftIcon} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="_ _ _ _ _ _"
                                            placeholderTextColor="#94a3b8"
                                            value={otp}
                                            onChangeText={(text) => {
                                                setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                                                setErrors({ ...errors, otp: '' });
                                            }}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                        />
                                    </View>
                                    {errors.otp ? <CustomText style={styles.errorText}>{errors.otp}</CustomText> : null}

                                    <View style={styles.buttonContainer}>
                                        <CustomButton
                                            title="Verify & Proceed"
                                            onPress={handleVerifyOtp}
                                            loading={isLoading}
                                        />
                                    </View>

                                    <View style={styles.resendContainer}>
                                        {countdown > 0 ? (
                                            <CustomText style={styles.resendText}>Resend OTP in {countdown}s</CustomText>
                                        ) : (
                                            <TouchableOpacity onPress={handleSendOtp}>
                                                <CustomText style={styles.resendLink}>Resend OTP</CustomText>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const moderScale = moderateScale;

const styles = StyleSheet.create({
    gradientContainer: { flex: 1 },
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: moderateScale(20) },
    backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 10 },
    floatingOrb: { position: 'absolute', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1000 },
    orb1: { width: 150, height: 150, top: '10%', left: '-5%' },
    orb2: { width: 200, height: 200, bottom: '10%', right: '-10%' },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: moderateScale(24),
        padding: moderateScale(24),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    header: { alignItems: 'center', marginBottom: moderateScale(30) },
    title: { fontSize: moderateScale(24), fontWeight: 'bold', color: '#1e293b', marginTop: moderateScale(15) },
    subtitle: { fontSize: moderateScale(14), color: '#64748b', textAlign: 'center', marginTop: moderateScale(10), lineHeight: 20 },
    form: { width: '100%' },
    inputGroup: { marginBottom: moderateScale(20) },
    label: { fontSize: moderateScale(13), fontWeight: '600', color: '#475569', marginBottom: moderateScale(8) },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: moderateScale(12),
        height: moderateScale(54),
        overflow: 'hidden',
    },
    inputError: { borderColor: '#ef4444' },
    phonePrefix: { height: '100%', borderRightWidth: 1, borderRightColor: '#cbd5e1', justifyContent: 'center', paddingHorizontal: 10 },
    leftIcon: { marginLeft: 12 },
    textInput: { flex: 1, height: '100%', fontSize: moderateScale(16), color: '#1e293b', paddingHorizontal: 15, fontWeight: '500' },
    errorText: { color: '#ef4444', fontSize: 12, marginTop: 5, marginLeft: 5 },
    buttonContainer: { marginTop: moderateScale(32) },
    button: { marginTop: moderateScale(20) },
    whatsappButton: {
        backgroundColor: '#25D366',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: moderateScale(54),
        borderRadius: moderateScale(12),
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonIcon: {
        marginRight: 10,
    },
    whatsappButtonText: {
        color: '#fff',
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
    resendContainer: { alignItems: 'center', marginTop: 20 },
    resendText: { color: '#64748b', fontSize: 14 },
    resendLink: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
});

export default ForgotPasswordScreen;
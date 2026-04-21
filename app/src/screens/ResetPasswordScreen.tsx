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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import CustomText from '@/components/ui/CustomText';
import { COLORS } from '@/constants/colors';
import { RootStackParamList } from '@/types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomButton from '@/components/ui/CustomButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResetPasswordMutation } from '@/features/auth/authApi';

type ResetPasswordNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor: number = 0.5) =>
    size + (scaleWidth(size) - size) * factor;

const ResetPasswordScreen = () => {
    const navigation = useNavigation<ResetPasswordNavigationProp>();
    const route = useRoute<ResetPasswordRouteProp>();
    
    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    // States
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({ password: '', confirm: '' });

    const [resetPassword, { isLoading }] = useResetPasswordMutation();

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleUpdatePassword = async () => {
        let valid = true;
        const newErrors = { password: '', confirm: '' };

        if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
            valid = false;
        }
        if (password !== confirmPassword) {
            newErrors.confirm = 'Passwords do not match';
            valid = false;
        }

        setErrors(newErrors);

        if (valid) {
            try {
                const response = await resetPassword({
                    countryCode: route.params.countryCode,
                    mobileNumber: route.params.phone,
                    otp: route.params.otp,
                    newPassword: password,
                }).unwrap();

                if (response.success) {
                    Alert.alert('Success', 'Your password has been reset successfully. Please login with your new password.', [
                        { text: 'Login Now', onPress: () => navigation.navigate('Login') }
                    ]);
                }
            } catch (error: any) {
                console.error('Reset password error:', error);
                const message = error.data?.message || 'Failed to reset password. Please try again.';
                Alert.alert('Error', message);
            }
        }
    };

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            style={styles.gradientContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.header}>
                            <View style={styles.iconCircle}>
                                <Icon name="shield-lock" size={40} color={COLORS.primary} />
                            </View>
                            <CustomText preset="heading" style={styles.title}>Reset Password</CustomText>
                            <CustomText style={styles.subtitle}>
                                Set a strong password for your account linked to {route.params.countryCode} {route.params.phone}
                            </CustomText>
                        </View>

                        <View style={styles.form}>
                            {/* New Password */}
                            <View style={styles.inputGroup}>
                                <CustomText preset="bodyMedium" style={styles.label}>New Password</CustomText>
                                <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                                    <Icon name="lock-outline" size={20} color="#64748b" style={styles.leftIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="••••••••"
                                        placeholderTextColor="#94a3b8"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            setErrors({ ...errors, password: '' });
                                        }}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                        <Icon name={showPassword ? "eye-off" : "eye"} size={20} color="#64748b" />
                                    </TouchableOpacity>
                                </View>
                                {errors.password ? <CustomText style={styles.errorText}>{errors.password}</CustomText> : null}
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.inputGroup}>
                                <CustomText preset="bodyMedium" style={styles.label}>Confirm Password</CustomText>
                                <View style={[styles.inputWrapper, errors.confirm && styles.inputError]}>
                                    <Icon name="lock-check-outline" size={20} color="#64748b" style={styles.leftIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="••••••••"
                                        placeholderTextColor="#94a3b8"
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            setErrors({ ...errors, confirm: '' });
                                        }}
                                        secureTextEntry={!showPassword}
                                    />
                                </View>
                                {errors.confirm ? <CustomText style={styles.errorText}>{errors.confirm}</CustomText> : null}
                            </View>

                            <CustomButton
                                title="Update Password"
                                onPress={handleUpdatePassword}
                                loading={isLoading}
                                style={styles.button}
                            />
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradientContainer: { flex: 1 },
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: moderateScale(20) },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: moderateScale(24),
        padding: moderateScale(24),
        shadowColor: '#000',
        elevation: 10,
    },
    header: { alignItems: 'center', marginBottom: moderateScale(30) },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f4ff', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: moderateScale(24), fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: moderateScale(14), color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 20 },
    form: { width: '100%' },
    inputGroup: { marginBottom: moderateScale(20) },
    label: { fontSize: moderateScale(13), fontWeight: '600', color: '#475569', marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: moderateScale(12),
        height: moderateScale(54),
        paddingHorizontal: 15,
    },
    inputError: { borderColor: '#ef4444' },
    leftIcon: { marginRight: 10 },
    textInput: { flex: 1, height: '100%', fontSize: moderateScale(16), color: '#1e293b', fontWeight: '500' },
    eyeIcon: { padding: 5 },
    errorText: { color: '#ef4444', fontSize: 12, marginTop: 5, marginLeft: 5 },
    button: { marginTop: moderateScale(10) },
});

export default ResetPasswordScreen;
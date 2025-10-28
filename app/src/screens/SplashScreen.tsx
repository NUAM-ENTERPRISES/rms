import { 
    View, 
    StyleSheet, 
    Image, 
    Animated, 
    ActivityIndicator, 
    Dimensions 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomText from '../components/CustomText';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../types/navigation';

type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Check if device is tablet
const isTablet = SCREEN_WIDTH >= 768;
const isSmallDevice = SCREEN_WIDTH <= 320;

const SplashScreen = () => {
    const navigation = useNavigation<SplashScreenNavigationProp>();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const textFadeAnim = useRef(new Animated.Value(0)).current;
    const loaderFadeAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const floatingAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Main animation sequence
        Animated.sequence([
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 60,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(textFadeAnim, {
                toValue: 1,
                duration: 800,
                delay: 300,
                useNativeDriver: true,
            }),
            Animated.timing(loaderFadeAnim, {
                toValue: 1,
                duration: 600,
                delay: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation for logo
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
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

        // Floating animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatingAnim, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
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

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const floatingInterpolate = floatingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
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
            {/* Floating elements for visual interest */}
            <Animated.View style={[styles.floatingCircle, styles.circle1, { 
                transform: [{ translateY: floatingInterpolate }] 
            }]} />
            <Animated.View style={[styles.floatingCircle, styles.circle2, { 
                transform: [{ translateY: floatingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 15],
                }) }] 
            }]} />
            <Animated.View style={[styles.floatingCircle, styles.circle3, { 
                transform: [{ translateY: floatingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                }) }] 
            }]} />

            <View style={styles.container}>
                <View style={styles.contentContainer}>
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            {
                                opacity: fadeAnim,
                                transform: [
                                    { scale: Animated.multiply(scaleAnim, pulseAnim) },
                                ]
                            }
                        ]}
                    >
                        {/* Shimmer effect overlay */}
                        <Animated.View style={[styles.shimmerOverlay, {
                            transform: [{ translateX: shimmerTranslate }]
                        }]} />
                        
                        <View style={styles.logoInnerShadow}>
                            <Image
                                source={require('../assets/logo/affiniks_logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                    </Animated.View>

                    <Animated.View style={[styles.textContainer, { 
                        opacity: textFadeAnim,
                        transform: [{ translateY: floatingInterpolate }]
                    }]}>
                        <CustomText preset='display' style={styles.appName}>
                            Affiniks International
                        </CustomText>
                        <View style={styles.taglineContainer}>
                            <CustomText preset='bodyMedium' style={styles.tagline}>
                                Streamlining healthcare recruitment
                            </CustomText>
                            <CustomText preset='bodyMedium' style={styles.tagline}>
                                with advanced technology and
                            </CustomText>
                            <CustomText preset='bodyMedium' style={styles.tagline}>
                                proven expertise.
                            </CustomText>
                        </View>
                    </Animated.View>
                </View>

                <Animated.View style={[styles.loaderContainer, { opacity: loaderFadeAnim }]}>
                    <View style={styles.customLoader}>
                        <Animated.View style={[styles.loaderDot, styles.dot1, {
                            transform: [{
                                scale: pulseAnim.interpolate({
                                    inputRange: [1, 1.05],
                                    outputRange: [0.8, 1.2],
                                })
                            }]
                        }]} />
                        <Animated.View style={[styles.loaderDot, styles.dot2, {
                            transform: [{
                                scale: pulseAnim.interpolate({
                                    inputRange: [1, 1.05],
                                    outputRange: [1.2, 0.8],
                                })
                            }]
                        }]} />
                        <Animated.View style={[styles.loaderDot, styles.dot3, {
                            transform: [{
                                scale: pulseAnim.interpolate({
                                    inputRange: [1, 1.05],
                                    outputRange: [0.8, 1.2],
                                })
                            }]
                        }]} />
                    </View>
                    <CustomText preset='caption' style={styles.loadingText}>
                        Loading your experience...
                    </CustomText>
                </Animated.View>
            </View>
        </LinearGradient>
    )
};

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SCREEN_HEIGHT * 0.05, // 5% of screen height
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    // Floating elements for background decoration
    floatingCircle: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 50,
    },
    circle1: {
        width: 80,
        height: 80,
        top: '15%',
        left: '10%',
    },
    circle2: {
        width: 120,
        height: 120,
        top: '70%',
        right: '8%',
    },
    circle3: {
        width: 60,
        height: 60,
        top: '25%',
        right: '15%',
    },
    logoContainer: {
        backgroundColor: COLORS.logoBackground,
        paddingVertical: SCREEN_HEIGHT * 0.02, // 2% of screen height
        paddingHorizontal: SCREEN_WIDTH * 0.15, // 15% of screen width
        borderRadius: SCREEN_WIDTH * 0.08, // 8% of screen width
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: SCREEN_HEIGHT * 0.01,
        },
        shadowOpacity: 0.25,
        shadowRadius: SCREEN_WIDTH * 0.02,
        elevation: 12,
        maxWidth: SCREEN_WIDTH * 0.85, // 85% of screen width max
        minWidth: SCREEN_WIDTH * 0.55, // 55% of screen width min
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
    logoInnerShadow: {
        shadowColor: COLORS.logoBackground,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    logo: {
        width: SCREEN_WIDTH * 0.45, // 45% of screen width
        height: SCREEN_HEIGHT * 0.2, // 20% of screen height
        maxWidth: 200, // Absolute max for very large screens
        maxHeight: 160, // Absolute max for very large screens
    },
    textContainer: {
        paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% of screen width
        width: '90%',
        maxWidth: 450,
        alignItems: 'center',
        marginTop: SCREEN_HEIGHT * 0.06, // 6% of screen height
    },
    appName: {
        textAlign: 'center',
        fontSize: SCREEN_WIDTH * 0.065, // 6.5% of screen width
        lineHeight: SCREEN_WIDTH * 0.08,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        letterSpacing: 0.5,
    },
    taglineContainer: {
        marginTop: SCREEN_HEIGHT * 0.03, // 3% of screen height
        alignItems: 'center',
    },
    tagline: {
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: SCREEN_HEIGHT * 0.03,
        fontSize: SCREEN_WIDTH * 0.038, // 3.8% of screen width
        fontWeight: '400',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0.5, height: 0.5 },
        textShadowRadius: 2,
        marginVertical: 2,
    },
    loaderContainer: {
        marginBottom: SCREEN_HEIGHT * 0.08, // 8% of screen height
        alignItems: 'center',
    },
    customLoader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SCREEN_HEIGHT * 0.02,
    },
    loaderDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        marginHorizontal: 4,
    },
    dot1: {
        backgroundColor: '#FF6B6B',
    },
    dot2: {
        backgroundColor: '#4ECDC4',
    },
    dot3: {
        backgroundColor: '#45B7D1',
    },
    loadingText: {
        marginTop: SCREEN_HEIGHT * 0.015, // 1.5% of screen height
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: SCREEN_WIDTH * 0.034, // 3.4% of screen width
        fontWeight: '500',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0.5, height: 0.5 },
        textShadowRadius: 2,
    },
});

export default SplashScreen;
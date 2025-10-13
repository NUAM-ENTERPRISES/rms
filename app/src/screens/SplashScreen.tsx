import { 
    View, 
    StyleSheet, 
    Image, 
    Animated, 
    ActivityIndicator, 
    Dimensions 
} from 'react-native';
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

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(textFadeAnim, {
                toValue: 1,
                duration: 600,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.timing(loaderFadeAnim, {
                toValue: 1,
                duration: 400,
                delay: 100,
                useNativeDriver: true,
            }),
        ]).start();

        const timer = setTimeout(() => {
            navigation.replace('Login');
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <Image
                        source={require('../assets/logo/affiniks_logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>

                <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
                    <CustomText preset='display' style={styles.appName}>
                        Affiniks International
                    </CustomText>
                    <CustomText preset='bodyMedium' style={styles.tagline}>
                        Streamlining healthcare recruitment{'\n'}with advanced technology and{'\n'}proven expertise.
                    </CustomText>
                </Animated.View>
            </View>

            <Animated.View style={[styles.loaderContainer, { opacity: loaderFadeAnim }]}>
                <ActivityIndicator size={isTablet ? 'large' : 'large'} color={COLORS.logoBackground} />
                <CustomText preset='caption' style={styles.loadingText}>
                    Loading...
                </CustomText>
            </Animated.View>
        </View>
    )
};

const styles = StyleSheet.create({
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
    logoContainer: {
        backgroundColor: COLORS.logoBackground,
        paddingVertical: SCREEN_HEIGHT * 0.015, // 1.5% of screen height
        paddingHorizontal: SCREEN_WIDTH * 0.15, // 15% of screen width
        borderRadius: SCREEN_WIDTH * 0.05, // 5% of screen width
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: SCREEN_HEIGHT * 0.005,
        },
        shadowOpacity: 0.3,
        shadowRadius: SCREEN_WIDTH * 0.012,
        elevation: 8,
        maxWidth: SCREEN_WIDTH * 0.8, // 80% of screen width max
        minWidth: SCREEN_WIDTH * 0.5, // 50% of screen width min
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
        maxWidth: 400,
        alignItems: 'center',
        marginTop: SCREEN_HEIGHT * 0.04, // 4% of screen height
    },
    appName: {
        textAlign: 'center',
        fontSize: SCREEN_WIDTH * 0.06, // 6% of screen width
        lineHeight: SCREEN_WIDTH * 0.08,
    },
    tagline: {
        marginTop: SCREEN_HEIGHT * 0.02, // 2% of screen height
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: SCREEN_HEIGHT * 0.024,
        fontSize: SCREEN_WIDTH * 0.035, // 3.5% of screen width
    },
    loaderContainer: {
        marginBottom: SCREEN_HEIGHT * 0.08, // 8% of screen height
        alignItems: 'center',
    },
    loadingText: {
        marginTop: SCREEN_HEIGHT * 0.015, // 1.5% of screen height
        opacity: 0.6,
        fontSize: SCREEN_WIDTH * 0.032, // 3.2% of screen width
    },
});

export default SplashScreen;
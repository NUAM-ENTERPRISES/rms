import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Image 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomText from '../components/CustomText';
import { COLORS } from '../constants/colors';

const LoadingScreen: React.FC = () => {
  // Get device dimensions
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const isTablet = SCREEN_WIDTH >= 768;

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Main entrance animation
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
    ]).start();

    // Continuous rotation for logo
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
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

    // Dots loading animation
    Animated.loop(
      Animated.timing(dotsAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();

    // Wave animation for progress bar
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
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
    outputRange: [0, -15],
  });

  const styles = StyleSheet.create({
    gradientContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SCREEN_HEIGHT * 0.05,
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
      width: 120,
      height: 120,
      top: '12%',
      left: '8%',
    },
    circle2: {
      width: 180,
      height: 180,
      top: '70%',
      right: '5%',
    },
    circle3: {
      width: 90,
      height: 90,
      top: '30%',
      right: '10%',
    },
    logoContainer: {
      backgroundColor: COLORS.logoBackground,
      paddingVertical: SCREEN_HEIGHT * 0.025,
      paddingHorizontal: SCREEN_WIDTH * 0.15,
      borderRadius: SCREEN_WIDTH * 0.08,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: SCREEN_HEIGHT * 0.012,
      },
      shadowOpacity: 0.3,
      shadowRadius: SCREEN_WIDTH * 0.025,
      elevation: 15,
      maxWidth: SCREEN_WIDTH * 0.8,
      minWidth: SCREEN_WIDTH * 0.6,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    logoInnerContainer: {
      shadowColor: COLORS.logoBackground,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.2,
      shadowRadius: 5,
    },
    logo: {
      width: SCREEN_WIDTH * 0.5,
      height: SCREEN_HEIGHT * 0.18,
      maxWidth: 220,
      maxHeight: 150,
    },
    textContainer: {
      paddingHorizontal: SCREEN_WIDTH * 0.05,
      width: '90%',
      maxWidth: 400,
      alignItems: 'center',
      marginTop: SCREEN_HEIGHT * 0.05,
    },
    loadingTitle: {
      textAlign: 'center',
      fontSize: SCREEN_WIDTH * 0.065,
      lineHeight: SCREEN_WIDTH * 0.08,
      fontWeight: '700',
      color: '#FFFFFF',
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
      letterSpacing: 0.8,
    },
    loadingSubtitle: {
      marginTop: SCREEN_HEIGHT * 0.015,
      textAlign: 'center',
      color: 'rgba(255, 255, 255, 0.9)',
      lineHeight: SCREEN_HEIGHT * 0.028,
      fontSize: SCREEN_WIDTH * 0.038,
      fontWeight: '400',
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 2,
    },
    loadingIndicatorContainer: {
      marginTop: SCREEN_HEIGHT * 0.06,
      alignItems: 'center',
      width: '100%',
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SCREEN_HEIGHT * 0.03,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      marginHorizontal: 6,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    progressContainer: {
      width: SCREEN_WIDTH * 0.6,
      height: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: SCREEN_HEIGHT * 0.025,
    },
    progressBackground: {
      flex: 1,
      position: 'relative',
    },
    progressWave: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      borderRadius: 3,
      width: 100,
    },
    processingText: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: SCREEN_WIDTH * 0.032,
      fontWeight: '500',
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 2,
      textAlign: 'center',
    },
    brandingContainer: {
      marginBottom: SCREEN_HEIGHT * 0.03,
      alignItems: 'center',
    },
    brandingText: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: SCREEN_WIDTH * 0.028,
      fontWeight: '400',
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 2,
      textAlign: 'center',
    },
  });

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.gradientContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Floating background elements */}
      <Animated.View style={[styles.floatingCircle, styles.circle1, { 
        transform: [{ translateY: floatingInterpolate }] 
      }]} />
      <Animated.View style={[styles.floatingCircle, styles.circle2, { 
        transform: [{ translateY: floatingAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 20],
        }) }] 
      }]} />
      <Animated.View style={[styles.floatingCircle, styles.circle3, { 
        transform: [{ translateY: floatingAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }) }] 
      }]} />

      <View style={styles.container}>
        <View style={styles.contentContainer}>
          {/* Animated Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: Animated.multiply(scaleAnim, pulseAnim) },
                  { rotate: rotateInterpolate },
                ]
              }
            ]}
          >
            <View style={styles.logoInnerContainer}>
              <Image
                source={require('../assets/logo/affiniks_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Loading Text */}
          <Animated.View style={[styles.textContainer, { 
            opacity: fadeAnim,
            transform: [{ translateY: floatingInterpolate }]
          }]}>
            <CustomText preset='heading' style={styles.loadingTitle}>
              Affiniks RMS
            </CustomText>
            <CustomText preset='bodyMedium' style={styles.loadingSubtitle}>
              Preparing your experience...
            </CustomText>
          </Animated.View>

          {/* Custom Loading Indicator */}
          <Animated.View style={[styles.loadingIndicatorContainer, { opacity: fadeAnim }]}>
            {/* Animated Dots */}
            <View style={styles.dotsContainer}>
              {[0, 1, 2, 3].map((index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      transform: [{
                        scale: dotsAnim.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange: index === 0 ? [1, 1.5, 1, 1, 1] :
                                     index === 1 ? [1, 1, 1.5, 1, 1] :
                                     index === 2 ? [1, 1, 1, 1.5, 1] :
                                                   [1, 1, 1, 1, 1.5],
                        })
                      }],
                      opacity: dotsAnim.interpolate({
                        inputRange: [0, 0.25, 0.5, 0.75, 1],
                        outputRange: index === 0 ? [0.3, 1, 0.3, 0.3, 0.3] :
                                   index === 1 ? [0.3, 0.3, 1, 0.3, 0.3] :
                                   index === 2 ? [0.3, 0.3, 0.3, 1, 0.3] :
                                                 [0.3, 0.3, 0.3, 0.3, 1],
                      })
                    }
                  ]}
                />
              ))}
            </View>

            {/* Progress Wave */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <Animated.View 
                  style={[
                    styles.progressWave,
                    {
                      transform: [{
                        translateX: waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-200, 200],
                        })
                      }]
                    }
                  ]}
                />
              </View>
            </View>

            <CustomText preset='caption' style={styles.processingText}>
              Processing secure authentication...
            </CustomText>
          </Animated.View>
        </View>

        {/* Bottom branding */}
        <Animated.View style={[styles.brandingContainer, { opacity: fadeAnim }]}>
          <CustomText preset='caption' style={styles.brandingText}>
            Powered by enterprise-grade technology
          </CustomText>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

export default LoadingScreen;
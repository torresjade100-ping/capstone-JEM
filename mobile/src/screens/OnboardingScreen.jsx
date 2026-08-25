import React from 'react';
import { View, Text, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

const ONBOARDING_SLIDES = [
  {
    title: 'Browse 500+ Products',
    desc: 'Explore a wide selection of cement, steel, tools, electrical, plumbing, and roofing supplies — all in one place.',
    icon: '🏗️',
    bg: '#fdfbf7',
    activeDotColor: '#f97316',
  },
  {
    title: 'Order Anytime, Anywhere',
    desc: 'Place orders from your phone and get your construction materials delivered directly to your site or project.',
    icon: '📦',
    bg: '#f0f7ff',
    activeDotColor: '#0f172a',
  },
  {
    title: 'Flexible Payment Methods',
    desc: 'Pay via GCash, Maya, or Cash on Delivery. Safe, secure, and convenient for every transaction.',
    icon: '💳',
    bg: '#effcf6',
    activeDotColor: '#10b981',
  },
];

export default function OnboardingScreen({
  slideIndex,
  onNextSlide,
  onNavigateToSignIn,
  onNavigateToSignUp,
}) {
  const currentSlide = ONBOARDING_SLIDES[slideIndex] || ONBOARDING_SLIDES[0];

  return (
    <SafeAreaView style={[styles.onboardingContainer, { backgroundColor: currentSlide.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={currentSlide.bg} />

      {/* Header Skip */}
      <View style={styles.onboardingHeader}>
        <View />
        <TouchableOpacity style={styles.skipBtn} onPress={onNavigateToSignIn}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Center Illustration */}
      <View style={styles.onboardingBody}>
        <View style={styles.onboardingIconCircle}>
          <Text style={{ fontSize: 68 }}>{currentSlide.icon}</Text>
        </View>

        <Text style={styles.onboardingTitle}>{currentSlide.title}</Text>
        <Text style={styles.onboardingDesc}>{currentSlide.desc}</Text>
      </View>

      {/* Footer */}
      <View style={styles.onboardingFooter}>
        <View style={styles.dotsRow}>
          {ONBOARDING_SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === slideIndex
                  ? [styles.activeDot, { backgroundColor: currentSlide.activeDotColor }]
                  : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {slideIndex < 2 ? (
          <TouchableOpacity style={styles.primaryAuthBtn} onPress={onNextSlide}>
            <Text style={styles.primaryAuthBtnText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 12 }}>
            <TouchableOpacity style={styles.primaryAuthBtn} onPress={onNavigateToSignIn}>
              <Text style={styles.primaryAuthBtnText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAuthBtn} onPress={onNavigateToSignUp}>
              <Text style={styles.secondaryAuthBtnText}>Create an Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

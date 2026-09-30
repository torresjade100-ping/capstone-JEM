import React, { useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  JemHexBadge,
} from '../components/AuthIcons';

export default function SignUpScreen({
  email,
  setEmail,
  name,
  setName,
  password,
  setPassword,
  phone,
  setPhone,
  rememberMe = true,
  setRememberMe,
  step = 1,
  setStep,
  loading = false,
  errorMsg = '',
  onRequestVerification,
  onCompleteSignUp,
  onGoogleSignUp,
  onNavigateToSignIn,
  onGoBack,
}) {
  const [internalStep, setInternalStep] = useState(step || 1);
  const currentStep = step !== undefined ? step : internalStep;
  const changeStep = setStep || setInternalStep;

  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHelpTip, setShowHelpTip] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleHelpPress = () => {
    if (Platform.OS === 'web') {
      setShowHelpTip((prev) => !prev);
    } else {
      Alert.alert(
        'Stay Signed In',
        'Keeps your account signed in on this device so you do not need to enter your password every time.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleNextPress = () => {
    const rawEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      setLocalError('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }
    setLocalError('');
    if (onRequestVerification) {
      onRequestVerification(rawEmail);
    }
  };

  const handleCreateAccountPress = () => {
    if (!name?.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!password?.trim() || password.trim().length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    setLocalError('');
    if (onCompleteSignUp) {
      onCompleteSignUp({
        email: (email || '').trim().toLowerCase(),
        name: name.trim(),
        password: password.trim(),
        phone: (phone || '').trim(),
      });
    }
  };

  const activeError = localError || errorMsg;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1320" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Top Bar: Back Arrow & JEM Brand Badge */}
          <View style={styles.topBar}>
            {currentStep === 2 ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setLocalError('');
                  changeStep(1);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
                accessibilityLabel="Back to email step"
              >
                <BackArrowIcon size={22} color="#FFFFFF" />
              </TouchableOpacity>
            ) : onGoBack ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onGoBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
              >
                <BackArrowIcon size={22} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}

            <View style={styles.brandBadgeBox}>
              <JemHexBadge size={30} />
            </View>
          </View>

          {/* Screen Title */}
          <Text style={styles.title}>
            {currentStep === 1 ? 'Sign Up' : 'Complete Your Account'}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {currentStep === 1
              ? 'Enter your real email address to get started.'
              : 'Your email is verified! Finish creating your profile below.'}
          </Text>

          {/* Error Message Box */}
          {activeError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {activeError}</Text>
            </View>
          ) : null}

          {currentStep === 1 ? (
            /* =========================================================
               STEP 1: Email Address + NEXT + Continue with Google
               ========================================================= */
            <View>
              {/* Email Address Input Field */}
              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'email' && styles.inputContainerFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Email Address (e.g. name@gmail.com)"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={(val) => {
                    setEmail && setEmail(val);
                    if (localError) setLocalError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Full-width NEXT Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.85 }]}
                onPress={handleNextPress}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>NEXT</Text>
                )}
              </TouchableOpacity>

              {/* Stay Signed In Checkbox with Help Icon */}
              <View style={styles.staySignedInContainer}>
                <TouchableOpacity
                  style={styles.staySignedInRow}
                  onPress={() => setRememberMe && setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.staySignedInText}>Stay Signed In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleHelpPress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.helpCircle}
                  accessibilityLabel="Stay signed in information"
                >
                  <Text style={styles.helpText}>?</Text>
                </TouchableOpacity>
              </View>

              {/* Web Inline Help Tip */}
              {showHelpTip && (
                <View style={styles.helpTooltip}>
                  <Text style={styles.helpTooltipText}>
                    💡 Keeps your account signed in on this device so you do not need to enter your password every time.
                  </Text>
                </View>
              )}

              {/* Subtle OR Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login: Continue with Google */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={onGoogleSignUp}
                disabled={loading}
                activeOpacity={0.8}
              >
                <GoogleIcon size={20} />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Terms & Privacy Notice */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By signing up, you agree to JEM's{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' & '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>

              {/* Bottom Navigation: Have an account? Log In */}
              <View style={styles.bottomNavContainer}>
                <Text style={styles.bottomNavText}>
                  Have an account?{' '}
                  <Text
                    style={styles.bottomNavHighlight}
                    onPress={onNavigateToSignIn}
                    accessibilityRole="button"
                  >
                    Log In
                  </Text>
                </Text>
              </View>
            </View>
          ) : (
            /* =========================================================
               STEP 2: Details & Password to Finalize Account Registration
               ========================================================= */
            <View>
              {/* Verified Email Confirmation Card */}
              <View style={styles.verifiedEmailCard}>
                <View style={styles.verifiedBadgeRow}>
                  <View style={styles.checkPill}>
                    <Text style={styles.checkPillText}>✓ VERIFIED</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setLocalError('');
                      changeStep(1);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.changeEmailLink}>Change Email</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.verifiedEmailAddress}>{email}</Text>
              </View>

              {/* Input: Full Name */}
              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'name' && styles.inputContainerFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={(val) => {
                    setName && setName(val);
                    if (localError) setLocalError('');
                  }}
                  autoCapitalize="words"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Input: Password */}
              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'password' && styles.inputContainerFocused,
                ]}
              >
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Create a Password (min. 6 characters)"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={(val) => {
                    setPassword && setPassword(val);
                    if (localError) setLocalError('');
                  }}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />

                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOffIcon size={20} color="#94A3B8" />
                  ) : (
                    <EyeIcon size={20} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Input: Optional Phone Number */}
              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'phone' && styles.inputContainerFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (Optional, e.g. 09171234567)"
                  placeholderTextColor="#64748B"
                  value={phone}
                  onChangeText={(val) => {
                    setPhone && setPhone(val);
                    if (localError) setLocalError('');
                  }}
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Primary Action Button: CREATE ACCOUNT */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.85 }]}
                onPress={handleCreateAccountPress}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>CREATE ACCOUNT</Text>
                )}
              </TouchableOpacity>

              {/* Return to Email Step */}
              <TouchableOpacity
                style={styles.secondaryStepBackBtn}
                onPress={() => changeStep(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryStepBackText}>← Back to Email Step</Text>
              </TouchableOpacity>

              {/* Terms & Privacy Notice */}
              <View style={[styles.termsContainer, { marginTop: 14 }]}>
                <Text style={styles.termsText}>
                  By creating an account, you agree to JEM's{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' & '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>

              {/* Bottom Navigation */}
              <View style={styles.bottomNavContainer}>
                <Text style={styles.bottomNavText}>
                  Have an account?{' '}
                  <Text
                    style={styles.bottomNavHighlight}
                    onPress={onNavigateToSignIn}
                    accessibilityRole="button"
                  >
                    Log In
                  </Text>
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1320',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#0B1320',
  },
  scrollContent: {
    paddingHorizontal: 26,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    minHeight: 38,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backBtnPlaceholder: {
    width: 38,
    height: 38,
  },
  brandBadgeBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#94A3B8',
    lineHeight: 19,
    marginBottom: 22,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1A2E',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1E2C42',
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputContainerFocused: {
    borderColor: '#F97316',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#FFFFFF',
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 4,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  staySignedInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  staySignedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#0F1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  staySignedInText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  helpCircle: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#1E2C42',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 7,
  },
  helpText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  helpTooltip: {
    backgroundColor: '#162338',
    borderWidth: 1,
    borderColor: '#2A3C56',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  helpTooltipText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E2C42',
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1E2C42',
    backgroundColor: '#0F1A2E',
    marginBottom: 24,
    gap: 10,
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  termsContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },
  termsLink: {
    color: '#38BDF8',
    fontWeight: '500',
  },
  bottomNavContainer: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#162338',
  },
  bottomNavText: {
    fontSize: 13.5,
    color: '#64748B',
  },
  bottomNavHighlight: {
    color: '#F97316',
    fontWeight: '700',
  },
  verifiedEmailCard: {
    backgroundColor: '#0F1A2E',
    borderWidth: 1,
    borderColor: '#1E2C42',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkPill: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  checkPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4ADE80',
    letterSpacing: 0.5,
  },
  changeEmailLink: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#F97316',
  },
  verifiedEmailAddress: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryStepBackBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  secondaryStepBackText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});

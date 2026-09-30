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

export default function SignInScreen({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe = true,
  setRememberMe,
  loading = false,
  errorMsg = '',
  onSignIn,
  onGoogleSignIn,
  onForgotPassword,
  onNavigateToSignUp,
  onGoBack,
}) {
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
          {/* Top Navigation Bar: Back Arrow & JEM Brand Badge */}
          <View style={styles.topBar}>
            {onGoBack ? (
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
          <Text style={styles.title}>Log In</Text>

          {/* Error Box */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          {/* Input 1: Phone number / Username / Email */}
          <View
            style={[
              styles.inputContainer,
              focusedField === 'loginId' && styles.inputContainerFocused,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Phone number / Username / Email"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onFocus={() => setFocusedField('loginId')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Input 2: Password with Eye Toggle & Forgot? Link */}
          <View
            style={[
              styles.inputContainer,
              focusedField === 'password' && styles.inputContainerFocused,
            ]}
          >
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />

            <View style={styles.passwordRightControls}>
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword && setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOffIcon size={20} color="#94A3B8" />
                ) : (
                  <EyeIcon size={20} color="#94A3B8" />
                )}
              </TouchableOpacity>

              <View style={styles.fieldDivider} />

              <TouchableOpacity
                onPress={onForgotPassword}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotText}>Forgot?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Primary Action Button: Full-Width LOG IN */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.85 }]}
            onPress={onSignIn}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>LOG IN</Text>
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

          {/* Single Social Login: Continue with Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={onGoogleSignIn || onSignIn}
            activeOpacity={0.8}
          >
            <GoogleIcon size={20} />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Terms & Privacy Notice */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By logging in, you agree to JEM's{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' & '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Bottom Navigation: New here? Sign Up */}
          <View style={styles.bottomNavContainer}>
            <Text style={styles.bottomNavText}>
              New here?{' '}
              <Text
                style={styles.bottomNavHighlight}
                onPress={onNavigateToSignUp}
                accessibilityRole="button"
              >
                Sign Up
              </Text>
            </Text>
          </View>
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
    marginBottom: 22,
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
    marginBottom: 26,
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
  passwordRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#1E2C42',
    marginHorizontal: 12,
  },
  forgotText: {
    fontSize: 13.5,
    color: '#F97316',
    fontWeight: '600',
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
  },
  checkboxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: -1,
  },
  staySignedInText: {
    fontSize: 13.5,
    color: '#94A3B8',
    fontWeight: '500',
    marginLeft: 8,
  },
  helpCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  helpText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    lineHeight: 12,
  },
  helpTooltip: {
    backgroundColor: '#0F1A2E',
    borderWidth: 1,
    borderColor: '#1E2C42',
    borderRadius: 6,
    padding: 10,
    marginTop: -14,
    marginBottom: 18,
  },
  helpTooltipText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E2C42',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1E2C42',
    backgroundColor: '#0F1A2E',
    marginBottom: 28,
  },
  googleBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsContainer: {
    marginBottom: 26,
    paddingHorizontal: 10,
  },
  termsText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#F97316',
    fontWeight: '600',
  },
  bottomNavContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  bottomNavText: {
    fontSize: 14,
    color: '#64748B',
  },
  bottomNavHighlight: {
    color: '#F97316',
    fontWeight: '700',
  },
});

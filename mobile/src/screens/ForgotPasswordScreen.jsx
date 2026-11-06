import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  JemHexBadge,
} from '../components/AuthIcons';
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from '../api/forgotPasswordApi';

export default function ForgotPasswordScreen({
  initialEmail = '',
  onNavigateToSignIn,
  onGoBack,
}) {
  // Step state: 'request' | 'otp' | 'reset' | 'success'
  const [step, setStep] = useState('request');

  // Form Fields
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  // OTP Resend Cooldown
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Auto-focus first OTP digit when entering 'otp' step
  useEffect(() => {
    if (step === 'otp') {
      const timerId = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 250);
      return () => clearTimeout(timerId);
    }
  }, [step]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && timer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  // =========================================================================
  // STEP 1: REQUEST OTP
  // =========================================================================
  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid Gmail / email address.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await requestPasswordResetOtp(cleanEmail);
      setSuccessMsg(res?.message || 'Verification code sent to your email.');
      setTimer(60);
      setStep('otp');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // STEP 2: VERIFY OTP
  // =========================================================================
  const handleDigitChange = (val, index) => {
    const clean = val.replace(/[^0-9]/g, '');

    // Handle full paste of multiple digits
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      const newCode = ['', '', '', '', '', ''];
      chars.forEach((ch, idx) => {
        if (idx < 6) {
          newCode[idx] = ch;
        }
      });
      setCode(newCode);
      setErrorMsg('');
      const nextIndex = Math.min(chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = clean.slice(-1);
    setCode(newCode);
    setErrorMsg('');

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullCode = code.join('');

  const handleVerifyOtp = async () => {
    if (fullCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await verifyPasswordResetOtp(email.trim().toLowerCase(), fullCode);
      const token = res?.data?.reset_token || res?.reset_token || '';
      setResetToken(token);
      setSuccessMsg('OTP verified successfully! Please set your new password.');
      setStep('reset');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await requestPasswordResetOtp(email.trim().toLowerCase());
      setSuccessMsg(res?.message || 'New 6-digit code sent to your email.');
      setCode(['', '', '', '', '', '']);
      setTimer(60);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // STEP 3: RESET PASSWORD
  // =========================================================================
  const handleResetPassword = async () => {
    if (!password || password.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password confirmation does not match.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await resetPassword({
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: confirmPassword,
        reset_token: resetToken,
        otp: fullCode,
      });

      setSuccessMsg(res?.message || 'Password reset successfully!');
      setStep('success');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password. Please restart the process.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (step === 'otp') {
      setStep('request');
    } else if (step === 'reset') {
      setStep('otp');
    } else {
      if (onGoBack) onGoBack();
      else if (onNavigateToSignIn) onNavigateToSignIn();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
        >
          {/* Responsive Card Container: Constrains width on tablets & desktop, fills mobile */}
          <View style={styles.cardContainer}>
            {/* Top Bar with Brand Badge & Back Arrow */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                accessibilityLabel="Go back"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <BackArrowIcon size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.brandBadgeBox}>
                <JemHexBadge size={34} />
              </View>

              <View style={styles.backBtnPlaceholder} />
            </View>

            {/* Stepper Indicator */}
            <View style={styles.stepperRow}>
              <View
                style={[
                  styles.stepDot,
                  (step === 'request' || step === 'otp' || step === 'reset' || step === 'success') &&
                    styles.stepDotActive,
                ]}
              />
              <View
                style={[
                  styles.stepLine,
                  (step === 'otp' || step === 'reset' || step === 'success') && styles.stepLineActive,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  (step === 'otp' || step === 'reset' || step === 'success') && styles.stepDotActive,
                ]}
              />
              <View
                style={[styles.stepLine, (step === 'reset' || step === 'success') && styles.stepLineActive]}
              />
              <View
                style={[styles.stepDot, (step === 'reset' || step === 'success') && styles.stepDotActive]}
              />
            </View>

            {/* Error Banner */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {/* Success Banner */}
            {successMsg && !errorMsg && step !== 'success' ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✓ {successMsg}</Text>
              </View>
            ) : null}

            {/* ================================================================= */}
            {/* STEP 1: REQUEST OTP                                               */}
            {/* ================================================================= */}
            {step === 'request' && (
              <View style={styles.contentBlock}>
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>
                  Enter your registered Gmail or email address. We will send a secure 6-digit OTP code to verify your identity.
                </Text>

                {/* Email Input Field */}
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'email' && styles.inputContainerFocused,
                  ]}
                >
                  <View style={styles.inputIconBox}>
                    <MailIcon size={18} color={focusedField === 'email' ? '#F97316' : '#64748B'} />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      Platform.OS === 'web' && { outlineStyle: 'none' },
                    ]}
                    placeholder="Enter your registered email"
                    placeholderTextColor="#64748B"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Primary Action Button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.85 }]}
                  onPress={handleRequestOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>SEND 6-DIGIT CODE</Text>
                  )}
                </TouchableOpacity>

                {/* Bottom Navigation */}
                <View style={styles.bottomNavContainer}>
                  <Text style={styles.bottomNavText}>
                    Remember your password?{' '}
                    <Text
                      style={styles.bottomNavHighlight}
                      onPress={() => onNavigateToSignIn && onNavigateToSignIn(email)}
                    >
                      Log In
                    </Text>
                  </Text>
                </View>
              </View>
            )}

            {/* ================================================================= */}
            {/* STEP 2: VERIFY OTP                                                */}
            {/* ================================================================= */}
            {step === 'otp' && (
              <View style={styles.contentBlock}>
                <Text style={styles.title}>Verify OTP Code</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit verification code to{' '}
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{email}</Text>. Please enter it below.
                </Text>

                <TouchableOpacity
                  style={styles.changeEmailRow}
                  onPress={() => setStep('request')}
                >
                  <Text style={styles.changeEmailText}>Wrong email? Tap here to edit</Text>
                </TouchableOpacity>

                {/* 6 Individual Digit Boxes: Perfectly Scaled & Responsive */}
                <View style={styles.otpGrid}>
                  {code.map((digit, idx) => (
                    <TextInput
                      key={`otp-box-${idx}`}
                      ref={(ref) => (inputRefs.current[idx] = ref)}
                      style={[
                        styles.otpBox,
                        digit ? styles.otpBoxFilled : null,
                        focusedField === `digit-${idx}` && styles.otpBoxFocused,
                        Platform.OS === 'web' && { minWidth: 0, outlineStyle: 'none' },
                      ]}
                      value={digit}
                      onChangeText={(val) => handleDigitChange(val, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      keyboardType="number-pad"
                      maxLength={6}
                      selectTextOnFocus
                      textAlign="center"
                      placeholder="-"
                      placeholderTextColor="#334155"
                      onFocus={() => setFocusedField(`digit-${idx}`)}
                      onBlur={() => setFocusedField(null)}
                    />
                  ))}
                </View>

                {/* Verify OTP Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (loading || fullCode.length !== 6) && { opacity: 0.85 },
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={loading || fullCode.length !== 6}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>VERIFY OTP CODE</Text>
                  )}
                </TouchableOpacity>

                {/* Resend Code Section */}
                <View style={styles.resendContainer}>
                  {canResend ? (
                    <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                      <Text style={styles.resendActiveText}>Resend Code via Email</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.resendCooldownText}>
                      Resend code in <Text style={{ color: '#F97316', fontWeight: '700' }}>{timer}s</Text>
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* ================================================================= */}
            {/* STEP 3: RESET PASSWORD                                            */}
            {/* ================================================================= */}
            {step === 'reset' && (
              <View style={styles.contentBlock}>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Choose a strong new password with at least 6 characters.
                </Text>

                {/* New Password Input */}
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'password' && styles.inputContainerFocused,
                  ]}
                >
                  <View style={styles.inputIconBox}>
                    <LockIcon size={18} color={focusedField === 'password' ? '#F97316' : '#64748B'} />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      { flex: 1 },
                      Platform.OS === 'web' && { outlineStyle: 'none' },
                    ]}
                    placeholder="New Password (min. 6 chars)"
                    placeholderTextColor="#64748B"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOffIcon size={20} color="#94A3B8" />
                    ) : (
                      <EyeIcon size={20} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Confirm Password Input */}
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'confirmPassword' && styles.inputContainerFocused,
                  ]}
                >
                  <View style={styles.inputIconBox}>
                    <LockIcon
                      size={18}
                      color={focusedField === 'confirmPassword' ? '#F97316' : '#64748B'}
                    />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      { flex: 1 },
                      Platform.OS === 'web' && { outlineStyle: 'none' },
                    ]}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#64748B"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon size={20} color="#94A3B8" />
                    ) : (
                      <EyeIcon size={20} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Password Requirement Hint */}
                <View style={styles.hintsBox}>
                  <Text
                    style={[
                      styles.hintText,
                      password.length >= 6 && { color: '#4ADE80' },
                    ]}
                  >
                    {password.length >= 6 ? '✓' : '•'} At least 6 characters
                  </Text>
                  <Text
                    style={[
                      styles.hintText,
                      password && password === confirmPassword && { color: '#4ADE80' },
                    ]}
                  >
                    {password && password === confirmPassword ? '✓' : '•'} Passwords match
                  </Text>
                </View>

                {/* Submit Reset Button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.85 }]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>UPDATE PASSWORD</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ================================================================= */}
            {/* STEP 4: SUCCESS CONFIRMATION                                      */}
            {/* ================================================================= */}
            {step === 'success' && (
              <View style={styles.successCard}>
                <View style={styles.successIconCircle}>
                  <Text style={{ fontSize: 34 }}>🎉</Text>
                </View>
                <Text style={styles.successTitle}>Password Reset Successful!</Text>
                <Text style={styles.successDescription}>
                  Your account password has been updated securely. You can now log in with your new credentials.
                </Text>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => onNavigateToSignIn && onNavigateToSignIn(email)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>RETURN TO LOG IN</Text>
                </TouchableOpacity>
              </View>
            )}
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 18,
    paddingBottom: 32,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
  },
  contentBlock: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    minHeight: 44,
    width: '100%',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  brandBadgeBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E2C42',
  },
  stepDotActive: {
    backgroundColor: '#F97316',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 22,
    height: 2,
    backgroundColor: '#1E2C42',
  },
  stepLineActive: {
    backgroundColor: '#F97316',
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 18,
  },
  changeEmailRow: {
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  changeEmailText: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  successText: {
    color: '#4ADE80',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1A2E',
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#1E2C42',
    height: 50,
    paddingHorizontal: 14,
    marginBottom: 16,
    width: '100%',
  },
  inputContainerFocused: {
    borderColor: '#F97316',
  },
  inputIconBox: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#FFFFFF',
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeBtn: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    marginBottom: 24,
    gap: 6,
  },
  otpBox: {
    flex: 1,
    minWidth: 0,
    maxWidth: 46,
    height: 52,
    backgroundColor: '#0F1A2E',
    borderWidth: 1.5,
    borderColor: '#1E2C42',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  otpBoxFilled: {
    borderColor: '#F97316',
    backgroundColor: '#162338',
  },
  otpBoxFocused: {
    borderColor: '#F97316',
    backgroundColor: '#162338',
    borderWidth: 2,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  resendCooldownText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  resendActiveText: {
    color: '#F97316',
    fontSize: 13.5,
    fontWeight: '700',
  },
  hintsBox: {
    backgroundColor: '#0F1A2E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1E2C42',
    gap: 6,
    width: '100%',
  },
  hintText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
  bottomNavContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  bottomNavText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  bottomNavHighlight: {
    color: '#F97316',
    fontWeight: '700',
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 24,
    width: '100%',
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 2,
    borderColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
});

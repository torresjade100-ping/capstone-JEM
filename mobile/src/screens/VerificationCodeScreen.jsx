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
import { BackArrowIcon, JemHexBadge } from '../components/AuthIcons';

export default function VerificationCodeScreen({
  email,
  maskedEmail,
  onChangeEmail,
  onVerifyOtp,
  onResendOtp,
  onCancel,
  loading = false,
  errorMsg = '',
  resendCooldown = 60,
}) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(resendCooldown || 60);
  const [localError, setLocalError] = useState('');
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // Auto-focus first input box on screen load
  useEffect(() => {
    const timerId = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 200);
    return () => clearTimeout(timerId);
  }, []);

  // Countdown timer for resend rate limiting
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleDigitChange = (val, index) => {
    // Clean to numeric only
    const clean = val.replace(/[^0-9]/g, '');

    // Handle paste of full 6 digits
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      const newCode = [...code];
      chars.forEach((ch, idx) => {
        if (index + idx < 6) {
          newCode[index + idx] = ch;
        }
      });
      setCode(newCode);
      setLocalError('');
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = clean;
    setCode(newCode);
    setLocalError('');

    // Auto advance to next box if character entered
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

  const handleVerify = () => {
    if (fullCode.length !== 6) {
      setLocalError('Please enter all 6 digits of your verification code.');
      return;
    }
    setLocalError('');
    if (onVerifyOtp) {
      onVerifyOtp(fullCode);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;
    setResending(true);
    setLocalError('');
    try {
      if (onResendOtp) {
        await onResendOtp();
      }
      setTimer(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setLocalError(err.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = () => {
    if (onChangeEmail) {
      onChangeEmail();
    } else if (onCancel) {
      onCancel();
    }
  };

  const activeError = localError || errorMsg;
  const displayEmail = email || maskedEmail || 'your email';

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
          {/* Top Bar with Back Arrow and JEM Badge */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleChangeEmail}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
            >
              <BackArrowIcon size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.brandBadgeBox}>
              <JemHexBadge size={30} />
            </View>
          </View>

          {/* Screen Title */}
          <Text style={styles.title}>Verify Your Email</Text>

          {/* Subtitle with Real Email and Change link */}
          <View style={styles.subtitleBox}>
            <Text style={styles.subtitleText}>
              We sent a verification code to
            </Text>
            <View style={styles.emailRow}>
              <Text style={styles.emailHighlight} numberOfLines={1} ellipsizeMode="middle">
                {displayEmail}
              </Text>
              <TouchableOpacity
                onPress={handleChangeEmail}
                style={styles.changeEmailBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Text style={styles.changeEmailText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Message Box */}
          {activeError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {activeError}</Text>
            </View>
          ) : null}

          {/* 6-Digit OTP Input Boxes */}
          <View style={styles.otpRow}>
            {code.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(ref) => (inputRefs.current[idx] = ref)}
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                  activeError ? styles.otpBoxError : null,
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
              />
            ))}
          </View>

          {/* Verify Action Button */}
          <TouchableOpacity
            style={[
              styles.verifyBtn,
              (fullCode.length !== 6 || loading) && styles.verifyBtnDisabled,
            ]}
            onPress={handleVerify}
            disabled={fullCode.length !== 6 || loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.verifyBtnText}>VERIFY</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section with Countdown Timer */}
          <View style={styles.resendSection}>
            <Text style={styles.resendPrompt}>Didn't receive the code?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={timer > 0 || resending}
              style={styles.resendBtn}
              activeOpacity={0.7}
            >
              {resending ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : timer > 0 ? (
                <Text style={styles.resendTimerText}>
                  Resend Code in <Text style={styles.resendCountdown}>{timer}s</Text>
                </Text>
              ) : (
                <Text style={styles.resendActiveText}>Resend Code</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View style={styles.securityNoticeBox}>
            <Text style={styles.securityNoticeText}>
              🔒 Secure OTP Verification powered by JEM Hardware. The verification code expires in 10 minutes.
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
    marginBottom: 10,
  },
  subtitleBox: {
    marginBottom: 24,
  },
  subtitleText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  emailHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F97316',
  },
  changeEmailBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#1E2C42',
    borderRadius: 4,
  },
  changeEmailText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginBottom: 20,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  otpBox: {
    flex: 1,
    height: 52,
    maxWidth: 48,
    backgroundColor: '#0F1A2E',
    borderWidth: 1.2,
    borderColor: '#1E2C42',
    borderRadius: 6,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 0,
  },
  otpBoxFilled: {
    borderColor: '#F97316',
    backgroundColor: '#162338',
  },
  otpBoxError: {
    borderColor: '#EF4444',
  },
  verifyBtn: {
    height: 48,
    borderRadius: 4,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  resendSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 6,
  },
  resendPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  resendBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  resendTimerText: {
    fontSize: 13.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  resendCountdown: {
    color: '#F97316',
    fontWeight: '700',
  },
  resendActiveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F97316',
    textDecorationLine: 'underline',
  },
  securityNoticeBox: {
    backgroundColor: '#0A0F1D',
    borderWidth: 1,
    borderColor: '#162338',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  securityNoticeText: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    textAlign: 'center',
  },
  cancelLinkBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelLinkText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});

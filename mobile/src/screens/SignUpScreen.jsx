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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  UserIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  JemBrandLogo,
} from '../components/AuthIcons';

export default function SignUpScreen({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  loading = false,
  errorMsg = '',
  onSignUp,
  onGoogleSignUp,
  onNavigateToSignIn,
  onGoBack,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#080D1A" />

      {/* 1. Deep Dark Slate Curved Top Header with Brand Logo & Tab Switcher */}
      <View style={styles.header}>
        <View style={styles.headerTopBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onGoBack || onNavigateToSignIn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <BackArrowIcon size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ width: 38 }} />
        </View>

        {/* JEM Hardware & Construction Supply Hexagon Logo */}
        <View style={styles.brandContainer}>
          <JemBrandLogo size={36} theme="dark" />
        </View>

        {/* Tab Switcher: Sign Up | Sign In */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={styles.tabItem}
            activeOpacity={1}
          >
            <Text style={styles.activeTabText}>Sign Up</Text>
            <View style={styles.activeIndicator} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={onNavigateToSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.inactiveTabText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Dark Slate Card Form Canvas */}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        overScrollMode="never"
      >
        <Text style={styles.welcomeTitle}>Create An Account</Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        {/* Full Name Field */}
        <View style={styles.inputContainer}>
          <View style={styles.inputIconBox}>
            <UserIcon size={18} color="#94A3B8" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email Field */}
        <View style={styles.inputContainer}>
          <View style={styles.inputIconBox}>
            <MailIcon size={18} color="#94A3B8" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password Field */}
        <View style={styles.inputContainer}>
          <View style={styles.inputIconBox}>
            <LockIcon size={18} color="#94A3B8" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {showPassword ? (
              <EyeOffIcon size={19} color="#94A3B8" />
            ) : (
              <EyeIcon size={19} color="#94A3B8" />
            )}
          </TouchableOpacity>
        </View>

        {/* Primary Action Button: Sign Up (Vibrant Orange) */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.85 }]}
          onPress={onSignUp}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Sign Up to Dashboard ↗</Text>
          )}
        </TouchableOpacity>

        {/* Divider: —— Or sign up with —— */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or sign up with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Auth: Only Gmail / Google as requested */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={onGoogleSignUp || onSignUp}
            activeOpacity={0.85}
          >
            <GoogleIcon size={19} />
            <Text style={styles.googleBtnText}>Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 3. Deep Dark Slate Curved Bottom Arc */}
      <View style={styles.bottomArc} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
    backgroundColor: '#0B1320',
  },
  header: {
    backgroundColor: '#080D1A',
    paddingTop: Platform.OS === 'ios' ? 14 : 18,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#162338',
  },
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 46,
    marginTop: 14,
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  activeTabText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  inactiveTabText: {
    fontSize: 16.5,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: -0.2,
  },
  activeIndicator: {
    height: 3,
    backgroundColor: '#F97316',
    borderRadius: 2,
    marginTop: 6,
    width: '100%',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  formScroll: {
    flex: 1,
    backgroundColor: '#0B1320',
  },
  formContent: {
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 20,
  },
  welcomeTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12.5,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1A2E',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#1E2C42',
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIconBox: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#FFFFFF',
    fontWeight: '600',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
    marginTop: 8,
    marginBottom: 24,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E2C42',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0F1A2E',
    borderWidth: 1.2,
    borderColor: '#1E2C42',
    height: 48,
    paddingHorizontal: 36,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  bottomArc: {
    height: 44,
    backgroundColor: '#080D1A',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#162338',
  },
});

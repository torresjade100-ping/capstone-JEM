import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { styles } from '../styles/appStyles';

export default function SignInScreen({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  loading = false,
  errorMsg = '',
  onSignIn,
  onForgotPassword,
  onNavigateToSignUp,
}) {
  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#131d2e" />

      {/* Top Dark Navy Header */}
      <View style={styles.authTopHeader}>
        <View style={styles.authMiniBrand}>
          <View style={styles.authMiniLogoBox}>
            <Text style={styles.authMiniLogoText}>JEM</Text>
          </View>
          <View>
            <Text style={styles.authMiniTitle}>JEM Hardware</Text>
            <Text style={styles.authMiniSubtitle}>& Construction Supply</Text>
          </View>
        </View>

        <Text style={styles.authHeroTitle}>Welcome back! 👋</Text>
        <Text style={styles.authHeroSubtitle}>Sign in to continue shopping</Text>
      </View>

      {/* White Card Form */}
      <ScrollView style={styles.authFormCard} showsVerticalScrollIndicator={false}>
        {errorMsg ? (
          <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, marginBottom: 14 }}>
            <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '700' }}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.authFieldGroup}>
          <Text style={styles.authFieldLabel}>Email / Mobile Number</Text>
          <TextInput
            style={styles.authInput}
            placeholder="Enter email or 09xxxxxxxxx"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.authFieldGroup}>
          <Text style={styles.authFieldLabel}>Password</Text>
          <View style={styles.authPasswordInputBox}>
            <TextInput
              style={[styles.authInput, { flex: 1, borderWidth: 0, paddingRight: 0 }]}
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.authOptionsRow}>
          <TouchableOpacity
            style={styles.rememberMeBox}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.primaryAuthBtn, loading && { opacity: 0.8 }]} 
          onPress={onSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryAuthBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.authFooterRow}>
          <Text style={styles.authFooterText}>Don't have an account? </Text>
          <TouchableOpacity onPress={onNavigateToSignUp}>
            <Text style={styles.authFooterLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

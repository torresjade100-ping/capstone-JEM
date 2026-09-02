import React, { useState } from 'react';
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
import { styles, COLORS } from '../styles/appStyles';

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
  onNavigateToSignIn,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#131d2e" />

      {/* Top Header */}
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

        <Text style={styles.authHeroTitle}>Create Account 🚀</Text>
        <Text style={styles.authHeroSubtitle}>
          Join JEM Hardware for exclusive contractor deals &amp; live delivery tracking
        </Text>
      </View>

      <ScrollView style={styles.authFormCard} showsVerticalScrollIndicator={false}>
        {errorMsg ? (
          <View
            style={{
              backgroundColor: '#fef2f2',
              borderWidth: 1,
              borderColor: '#fecaca',
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '700' }}>
              ⚠️ {errorMsg}
            </Text>
          </View>
        ) : null}

        <View style={styles.authFieldGroup}>
          <Text style={styles.authFieldLabel}>Full Name / Contractor Name</Text>
          <TextInput
            style={styles.authInput}
            placeholder="Enter your full name or company"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
          />
        </View>

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
              placeholder="Minimum 6 characters"
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

        <TouchableOpacity
          style={[styles.primaryAuthBtn, { marginTop: 10 }, loading && { opacity: 0.8 }]}
          onPress={onSignUp}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryAuthBtnText}>Create Contractor Account →</Text>
          )}
        </TouchableOpacity>

        <View style={styles.authFooterRow}>
          <Text style={styles.authFooterText}>Already have an account? </Text>
          <TouchableOpacity onPress={onNavigateToSignIn} activeOpacity={0.7}>
            <Text style={styles.authFooterLink}>Sign In here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

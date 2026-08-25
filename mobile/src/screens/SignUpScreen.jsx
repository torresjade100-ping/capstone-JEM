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
  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#131d2e" />

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
        <Text style={styles.authHeroSubtitle}>Join JEM Hardware for exclusive contractor deals</Text>
      </View>

      <ScrollView style={styles.authFormCard} showsVerticalScrollIndicator={false}>
        {errorMsg ? (
          <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, marginBottom: 14 }}>
            <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '700' }}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.authFieldGroup}>
          <Text style={styles.authFieldLabel}>Full Name / Contractor Name</Text>
          <TextInput
            style={styles.authInput}
            placeholder="Juan Dela Cruz"
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
          <TextInput
            style={styles.authInput}
            placeholder="Minimum 6 characters"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.primaryAuthBtn, loading && { opacity: 0.8 }]} 
          onPress={onSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryAuthBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.authFooterRow}>
          <Text style={styles.authFooterText}>Already have an account? </Text>
          <TouchableOpacity onPress={onNavigateToSignIn}>
            <Text style={styles.authFooterLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

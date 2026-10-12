import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PressableScale from './PressableScale';
import { PALETTE, GRADIENTS, RADIUS, SHADOWS } from './theme';

// ----------------------------------------------------------------------------
// Gradient navy screen header with decorative glow orbs
// ----------------------------------------------------------------------------
export function ScreenHeader({ eyebrow, title, subtitle, right, children, style }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={GRADIENTS.navy}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.header, { paddingTop: insets.top + 14 }, style]}
    >
      <View style={s.orbA} pointerEvents="none" />
      <View style={s.orbB} pointerEvents="none" />

      {(title || right) && (
        <View style={s.headerRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
            {title ? <Text style={s.title}>{title}</Text> : null}
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </LinearGradient>
  );
}

// Translucent square icon button for dark headers
export function GlassIconButton({ icon, onPress, badge = false, size = 20 }) {
  return (
    <PressableScale onPress={onPress} style={s.glassBtn} scaleTo={0.9}>
      <Ionicons name={icon} size={size} color="#FFFFFF" />
      {badge ? <View style={s.glassBadge} /> : null}
    </PressableScale>
  );
}

// ----------------------------------------------------------------------------
// Glass search bar for dark headers
// ----------------------------------------------------------------------------
export function SearchBar({ value, onChangeText, placeholder, style }) {
  return (
    <View style={[s.search, style]}>
      <Ionicons name="search" size={18} color="#94A3B8" />
      <TextInput
        style={s.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#7C8BA5"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color="#94A3B8" />
        </TouchableOpacity>
      ) : (
        <View style={s.searchKbd}>
          <Ionicons name="options-outline" size={15} color="#CBD5E1" />
        </View>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Primary orange gradient button
// ----------------------------------------------------------------------------
export function GradientButton({ label, icon, onPress, disabled, style, height = 54, trailing }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={[SHADOWS.orange, { borderRadius: RADIUS.lg }, style]}>
      <LinearGradient
        colors={disabled ? ['#CBD5E1', '#94A3B8'] : GRADIENTS.orange}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.gradBtn, { height }]}
      >
        {icon ? <Ionicons name={icon} size={19} color="#FFFFFF" style={{ marginRight: 8 }} /> : null}
        <Text style={s.gradBtnText}>{label}</Text>
        {trailing ? (
          <View style={s.gradBtnTrailing}>
            <Text style={s.gradBtnTrailingText}>{trailing}</Text>
          </View>
        ) : null}
      </LinearGradient>
    </PressableScale>
  );
}

// ----------------------------------------------------------------------------
// Section title row
// ----------------------------------------------------------------------------
export function SectionHeader({ title, caption, actionLabel, onAction, style }) {
  return (
    <View style={[s.sectionRow, style]}>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {caption ? <Text style={s.sectionCaption}>{caption}</Text> : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} style={s.sectionAction} activeOpacity={0.7}>
          <Text style={s.sectionActionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={PALETTE.orange600} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Small uppercase label above grouped content
export function Eyebrow({ children, style }) {
  return <Text style={[s.groupEyebrow, style]}>{children}</Text>;
}

// ----------------------------------------------------------------------------
// Empty state block
// ----------------------------------------------------------------------------
export function EmptyState({ icon, title, message, actionLabel, onAction }) {
  return (
    <View style={s.empty}>
      <LinearGradient colors={GRADIENTS.orangeSoft} style={s.emptyHalo}>
        <View style={s.emptyIconCore}>
          <Ionicons name={icon} size={40} color={PALETTE.orange500} />
        </View>
      </LinearGradient>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyMsg}>{message}</Text>
      {actionLabel ? (
        <GradientButton label={actionLabel} icon="arrow-forward" onPress={onAction} style={{ alignSelf: 'stretch', marginTop: 8 }} />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
    overflow: 'hidden',
  },
  orbA: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(249, 115, 22, 0.20)',
  },
  orbB: {
    position: 'absolute',
    bottom: -90,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: PALETTE.orange400,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: '#9AA8BF', marginTop: 4, fontWeight: '500', lineHeight: 18 },

  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassBadge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: PALETTE.orange500,
    borderWidth: 2,
    borderColor: PALETTE.navy800,
  },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF', paddingVertical: 0, outlineStyle: 'none' },
  searchKbd: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  gradBtn: {
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  gradBtnText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '900', letterSpacing: -0.2 },
  gradBtnTrailing: {
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  gradBtnTrailingText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: PALETTE.text, letterSpacing: -0.4 },
  sectionCaption: { fontSize: 12, color: PALETTE.textMuted, marginTop: 2, fontWeight: '500' },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: PALETTE.orange50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  sectionActionText: { fontSize: 12, fontWeight: '800', color: PALETTE.orange600 },

  groupEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: PALETTE.textMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28 },
  emptyHalo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  emptyIconCore: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: PALETTE.text, letterSpacing: -0.4, marginBottom: 6 },
  emptyMsg: {
    fontSize: 13.5,
    color: PALETTE.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 290,
  },
});

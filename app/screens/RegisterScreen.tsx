import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '../services/authService';
import { useResponsive } from '../hooks/useResponsive';
import { isValidEmail, getFirebaseErrorMessage } from '../utils/validation';

interface Props {
  onNavigateToLogin?: () => void;
  onRegistered?: () => void;
}

interface FieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
  general?: string;
}

export default function RegisterScreen({ onNavigateToLogin, onRegistered }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { isMobile, isDesktop, cardMaxWidth, fontSize, spacing } = useResponsive();

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Full name is required.';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    try {
      await registerUser(email.trim(), password, displayName.trim());
      setSuccess(true);
      setTimeout(() => onRegistered?.(), 1500);
    } catch (error: any) {
      const code = error?.code ?? '';
      setErrors({ general: getFirebaseErrorMessage(code) });
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <View style={styles.background}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, isDesktop && styles.innerDesktop]}>

            {/* Left branding — desktop/tablet only */}
            {!isMobile && (
              <View style={[styles.brandSide, isDesktop && styles.brandSideDesktop]}>
                <Text style={{ fontSize: fontSize.logoIcon }}>📝</Text>
                <Text style={[styles.logoText, { fontSize: fontSize.logo }]}>NoteApp</Text>
                <Text style={styles.logoSub}>Start your note-taking journey</Text>
                <View style={styles.featureList}>
                  <Text style={styles.featureItem}>✦  Free forever on Spark plan</Text>
                  <Text style={styles.featureItem}>✦  Sync across all devices</Text>
                  <Text style={styles.featureItem}>✦  AI-powered summaries</Text>
                  <Text style={styles.featureItem}>✦  Smart tags & search</Text>
                </View>
              </View>
            )}

            {/* Form side */}
            <View style={{ width: cardMaxWidth }}>

              {isMobile && (
                <View style={styles.mobileLogo}>
                  <Text style={{ fontSize: fontSize.logoIcon }}>📝</Text>
                  <Text style={[styles.logoText, { fontSize: fontSize.logo }]}>NoteApp</Text>
                </View>
              )}

              <View style={[styles.card, { padding: spacing.cardPadding }]}>
                <Text style={[styles.cardTitle, { fontSize: fontSize.cardTitle }]}>
                  Create Account
                </Text>
                <Text style={[styles.cardSubtitle, { fontSize: fontSize.cardSubtitle }]}>
                  Join thousands of smart note takers
                </Text>

                {/* General error */}
                {errors.general && (
                  <View style={styles.generalError}>
                    <Text style={styles.generalErrorText}>⚠️  {errors.general}</Text>
                  </View>
                )}

                {/* Success message */}
                {success && (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>✅  Account created! Redirecting...</Text>
                  </View>
                )}

                {/* Full Name */}
                <View style={[
                  styles.inputWrapper,
                  errors.displayName ? styles.inputError : focusedField === 'name' && styles.inputFocused,
                ]}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={[styles.input, { fontSize: fontSize.input, paddingVertical: spacing.inputVertical }]}
                    placeholder="Full Name"
                    placeholderTextColor="#888"
                    value={displayName}
                    onChangeText={(v) => { setDisplayName(v); clearError('displayName'); }}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    testID="name-input"
                  />
                </View>
                {errors.displayName && <Text style={styles.fieldError}>{errors.displayName}</Text>}

                {/* Email */}
                <View style={[
                  styles.inputWrapper,
                  errors.email ? styles.inputError : focusedField === 'email' && styles.inputFocused,
                ]}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={[styles.input, { fontSize: fontSize.input, paddingVertical: spacing.inputVertical }]}
                    placeholder="Email address"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={(v) => { setEmail(v); clearError('email'); }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    testID="email-input"
                  />
                </View>
                {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}

                {/* Password */}
                <View style={[
                  styles.inputWrapper,
                  errors.password ? styles.inputError : focusedField === 'password' && styles.inputFocused,
                ]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={[styles.input, { fontSize: fontSize.input, paddingVertical: spacing.inputVertical }]}
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearError('password'); }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    testID="password-input"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.eyeButton}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

                <TouchableOpacity
                  style={[styles.button, { paddingVertical: spacing.buttonVertical }, loading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading || success}
                  testID="register-button"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.buttonText, { fontSize: fontSize.button }]}>
                      Create Account →
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onNavigateToLogin}
                  testID="login-link"
                >
                  <Text style={[styles.secondaryText, { fontSize: fontSize.link }]}>
                    Already have an account?{' '}
                    <Text style={styles.secondaryHighlight}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#0f0f1a' },
  flex: { flex: 1 },
  blob1: {
    position: 'absolute', width: 350, height: 350, borderRadius: 175,
    backgroundColor: '#ff6cdf', opacity: 0.18, top: -80, right: -60,
  },
  blob2: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#6c47ff', opacity: 0.2, top: 180, left: -80,
  },
  blob3: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#00c2ff', opacity: 0.1, bottom: 40, right: 20,
  },
  scroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 48,
  },
  scrollDesktop: { paddingHorizontal: 64 },
  inner: { width: '100%', alignItems: 'center' },
  innerDesktop: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 64, maxWidth: 1000,
  },
  brandSide: { alignItems: 'flex-start', flex: 1, maxWidth: 400 },
  brandSideDesktop: { paddingRight: 16 },
  mobileLogo: { alignItems: 'center', marginBottom: 24 },
  logoText: { fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  logoSub: { fontSize: 15, color: '#888', marginTop: 8, marginBottom: 32 },
  featureList: { gap: 14 },
  featureItem: { color: '#aaa', fontSize: 15, lineHeight: 22 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  cardTitle: { fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  cardSubtitle: { color: '#888', marginBottom: 20 },
  generalError: {
    backgroundColor: 'rgba(255, 80, 80, 0.12)',
    borderWidth: 1, borderColor: 'rgba(255, 80, 80, 0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  generalErrorText: { color: '#ff6b6b', fontSize: 13 },
  successBox: {
    backgroundColor: 'rgba(50, 205, 130, 0.12)',
    borderWidth: 1, borderColor: 'rgba(50, 205, 130, 0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  successText: { color: '#32cd82', fontSize: 13 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 4, paddingHorizontal: 14,
  },
  inputError: { borderColor: '#ff6b6b' },
  inputFocused: { borderColor: '#6c47ff', borderWidth: 1.5 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  eyeButton: { paddingHorizontal: 6, paddingVertical: 4 },
  input: { flex: 1, color: '#fff', outlineWidth: 0 } as any,
  fieldError: { color: '#ff6b6b', fontSize: 12, marginBottom: 10, marginLeft: 4 },
  button: {
    backgroundColor: '#6c47ff', borderRadius: 12, alignItems: 'center',
    marginTop: 10, shadowColor: '#6c47ff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#666', paddingHorizontal: 12, fontSize: 13 },
  secondaryButton: { alignItems: 'center' },
  secondaryText: { color: '#888' },
  secondaryHighlight: { color: '#6c47ff', fontWeight: '700' },
});

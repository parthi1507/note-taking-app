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
import { loginUser } from '../services/authService';
import { useResponsive } from '../hooks/useResponsive';
import { isValidEmail, getFirebaseErrorMessage } from '../utils/validation';

interface Props {
  onNavigateToRegister?: () => void;
  onLoggedIn?: () => void;
  onNavigateToForgotPassword?: () => void;
}

interface FieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginScreen({ onNavigateToRegister, onLoggedIn, onNavigateToForgotPassword }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { isMobile, isDesktop, cardMaxWidth, fontSize, spacing } = useResponsive();

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    try {
      await loginUser(email.trim(), password);
      onLoggedIn?.();
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
                <Text style={styles.logoSub}>Your smart note-taking companion</Text>
                <View style={styles.featureList}>
                  <Text style={styles.featureItem}>✦  AI-powered note summaries</Text>
                  <Text style={styles.featureItem}>✦  Works offline</Text>
                  <Text style={styles.featureItem}>✦  Markdown support</Text>
                  <Text style={styles.featureItem}>✦  Tag & search notes</Text>
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
                  Welcome Back
                </Text>
                <Text style={[styles.cardSubtitle, { fontSize: fontSize.cardSubtitle }]}>
                  Sign in to continue
                </Text>

                {/* General error */}
                {errors.general && (
                  <View style={styles.generalError}>
                    <Text style={styles.generalErrorText}>⚠️  {errors.general}</Text>
                  </View>
                )}

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
                    placeholder="Password"
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
                  onPress={handleLogin}
                  disabled={loading}
                  testID="login-button"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.buttonText, { fontSize: fontSize.button }]}>
                      Sign In →
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={onNavigateToForgotPassword}
                  testID="forgot-password-link"
                >
                  <Text style={[styles.forgotText, { fontSize: fontSize.link }]}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onNavigateToRegister}
                  testID="register-link"
                >
                  <Text style={[styles.secondaryText, { fontSize: fontSize.link }]}>
                    Don't have an account?{' '}
                    <Text style={styles.secondaryHighlight}>Register</Text>
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
    backgroundColor: '#6c47ff', opacity: 0.2, top: -100, left: -80,
  },
  blob2: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#00c2ff', opacity: 0.12, top: 120, right: -60,
  },
  blob3: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#ff6cdf', opacity: 0.1, bottom: 60, left: 40,
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
  logoSub: { fontSize: 16, color: '#888', marginTop: 8, marginBottom: 32 },
  featureList: { gap: 14 },
  featureItem: { color: '#aaa', fontSize: 16, lineHeight: 24 },
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
  generalErrorText: { color: '#ff6b6b', fontSize: 14 },
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
  fieldError: { color: '#ff6b6b', fontSize: 13, marginBottom: 10, marginLeft: 4 },
  button: {
    backgroundColor: '#6c47ff', borderRadius: 12, alignItems: 'center',
    marginTop: 10, shadowColor: '#6c47ff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#666', paddingHorizontal: 12, fontSize: 14 },
  secondaryButton: { alignItems: 'center' },
  secondaryText: { color: '#888' },
  secondaryHighlight: { color: '#6c47ff', fontWeight: '700' },
  forgotBtn: { alignItems: 'flex-end', marginTop: 8 },
  forgotText: { color: '#a78bfa', fontWeight: '500' },
});

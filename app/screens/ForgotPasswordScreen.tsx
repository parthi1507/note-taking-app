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
import { sendPasswordReset } from '../services/authService';
import { isValidEmail } from '../utils/validation';

interface Props {
  onNavigateToLogin: () => void;
}

export default function ForgotPasswordScreen({ onNavigateToLogin }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSend = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await sendPasswordReset(email.trim());
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch {
      // silently fail
    } finally {
      setResendLoading(false);
    }
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
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {!sent ? (
              /* ── Step 1: Email entry ── */
              <>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconEmoji}>🔐</Text>
                </View>

                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠️  {error}</Text>
                  </View>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <View style={[
                    styles.inputWrapper,
                    focused && styles.inputFocused,
                    !!error && styles.inputError,
                  ]}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor="#555"
                      value={email}
                      onChangeText={(v) => { setEmail(v); setError(''); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onSubmitEditing={handleSend}
                      editable={!loading}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled]}
                  onPress={handleSend}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={onNavigateToLogin} disabled={loading}>
                  <Text style={styles.backBtnText}>← Back to Login</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Step 2: Email sent confirmation ── */
              <>
                <View style={[styles.iconWrap, styles.iconWrapSuccess]}>
                  <Text style={styles.iconEmoji}>📧</Text>
                </View>

                <Text style={styles.title}>Check Your Email</Text>
                <Text style={styles.subtitle}>We've sent a password reset link to</Text>
                <Text style={styles.emailHighlight}>{email}</Text>
                <Text style={styles.instruction}>
                  Click the link in the email to reset your password.{'\n'}
                  The link will expire in 1 hour.
                </Text>

                {resendSuccess && (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>✓  Reset link resent successfully!</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={onNavigateToLogin}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Back to Login</Text>
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  <Text style={styles.resendLabel}>Didn't receive it?  </Text>
                  <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
                    {resendLoading ? (
                      <ActivityIndicator color="#a78bfa" size="small" />
                    ) : (
                      <Text style={styles.resendLink}>Resend email</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.spamHint}>Also check your spam or junk folder.</Text>
              </>
            )}
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
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: '#6c47ff', opacity: 0.15, top: -80, left: -80,
  },
  blob2: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: '#00c2ff', opacity: 0.08, bottom: 80, right: -60,
  },
  blob3: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#ff6cdf', opacity: 0.07, bottom: 20, left: 40,
  },
  scroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 48,
  },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    padding: 32, alignItems: 'center',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  iconWrapSuccess: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  iconEmoji: { fontSize: 30 },
  title: {
    fontSize: 24, fontWeight: '800', color: '#f0f0ff',
    marginBottom: 8, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: '#888', textAlign: 'center',
    lineHeight: 21, marginBottom: 4,
  },
  emailHighlight: {
    fontSize: 15, color: '#a78bfa', fontWeight: '600',
    marginBottom: 12, textAlign: 'center',
  },
  instruction: {
    fontSize: 13, color: '#666', textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  errorBox: {
    width: '100%', backgroundColor: 'rgba(255,107,107,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#ff6b6b', fontSize: 13 },
  successBox: {
    width: '100%', backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  successText: { color: '#34d399', fontSize: 13, textAlign: 'center' },
  fieldGroup: { width: '100%', marginBottom: 20 },
  label: {
    fontSize: 11, fontWeight: '700', color: '#666',
    letterSpacing: 1.2, marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
  },
  inputFocused: { borderColor: '#6c47ff', borderWidth: 1.5 },
  inputError: { borderColor: '#ff6b6b' },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: {
    flex: 1, color: '#fff', fontSize: 15,
    paddingVertical: 14, outlineWidth: 0,
  } as any,
  primaryBtn: {
    width: '100%', backgroundColor: '#6c47ff', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginBottom: 16,
    shadowColor: '#6c47ff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn: { paddingVertical: 8 },
  backBtnText: { color: '#a78bfa', fontSize: 14, fontWeight: '500' },
  resendRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  resendLabel: { color: '#666', fontSize: 13 },
  resendLink: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  spamHint: { color: '#444', fontSize: 12, textAlign: 'center' },
});

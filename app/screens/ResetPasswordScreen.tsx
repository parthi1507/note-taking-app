import React, { useState, useEffect } from 'react';
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
import { getEmailFromResetCode, confirmNewPassword } from '../services/authService';

interface Props {
  oobCode: string;
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export default function ResetPasswordScreen({ oobCode, onSuccess, onNavigateToLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const associatedEmail = await getEmailFromResetCode(oobCode);
        setEmail(associatedEmail);
      } catch {
        setCodeError('This reset link is invalid or has expired. Please request a new one.');
      } finally {
        setVerifying(false);
      }
    })();
  }, [oobCode]);

  const validate = (): string => {
    if (!password) return 'Please enter a new password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleReset = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await confirmNewPassword(oobCode, password);
      setDone(true);
      setTimeout(() => onSuccess(), 2200);
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/expired-action-code') {
        setError('This reset link has expired. Please request a new one.');
      } else if (code === 'auth/invalid-action-code') {
        setError('This reset link is invalid. Please request a new one.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {verifying ? (
              /* Verifying link state */
              <>
                <ActivityIndicator color="#6c47ff" size="large" style={{ marginBottom: 16 }} />
                <Text style={styles.verifyingText}>Verifying reset link…</Text>
              </>
            ) : codeError ? (
              /* Invalid/expired code */
              <>
                <View style={[styles.iconWrap, styles.iconWrapError]}>
                  <Text style={styles.iconEmoji}>⚠️</Text>
                </View>
                <Text style={styles.title}>Link Expired</Text>
                <Text style={styles.subtitle}>{codeError}</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={onNavigateToLogin}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            ) : done ? (
              /* Success state */
              <>
                <View style={[styles.iconWrap, styles.iconWrapSuccess]}>
                  <Text style={styles.iconEmoji}>✅</Text>
                </View>
                <Text style={styles.title}>Password Reset!</Text>
                <Text style={styles.subtitle}>
                  Your password has been updated successfully.{'\n'}
                  Redirecting you to login…
                </Text>
                <ActivityIndicator color="#34d399" style={{ marginTop: 20 }} />
              </>
            ) : (
              /* Reset form */
              <>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconEmoji}>🔑</Text>
                </View>

                <Text style={styles.title}>Set New Password</Text>
                {email ? (
                  <Text style={styles.emailLabel}>{email}</Text>
                ) : null}

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠️  {error}</Text>
                  </View>
                ) : null}

                {/* New password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>NEW PASSWORD</Text>
                  <View style={[
                    styles.inputWrapper,
                    focusedField === 'password' && styles.inputFocused,
                  ]}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#555"
                      value={password}
                      onChangeText={(v) => { setPassword(v); setError(''); }}
                      secureTextEntry={!showPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((p) => !p)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>CONFIRM PASSWORD</Text>
                  <View style={[
                    styles.inputWrapper,
                    focusedField === 'confirm' && styles.inputFocused,
                  ]}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#555"
                      value={confirmPassword}
                      onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                      secureTextEntry={!showConfirm}
                      onFocus={() => setFocusedField('confirm')}
                      onBlur={() => setFocusedField(null)}
                      onSubmitEditing={handleReset}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirm((p) => !p)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Strength hint */}
                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    {[1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBar,
                          password.length >= i * 3
                            ? password.length >= 10
                              ? styles.strengthStrong
                              : styles.strengthMedium
                            : styles.strengthWeak,
                        ]}
                      />
                    ))}
                    <Text style={styles.strengthLabel}>
                      {password.length < 6
                        ? 'Too short'
                        : password.length < 10
                        ? 'Fair'
                        : 'Strong'}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled]}
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={onNavigateToLogin}
                  disabled={loading}
                >
                  <Text style={styles.backBtnText}>← Back to Login</Text>
                </TouchableOpacity>
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
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#6c47ff', opacity: 0.14, top: -60, right: -80,
  },
  blob2: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#00c2ff', opacity: 0.07, bottom: 60, left: -40,
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
  verifyingText: { color: '#888', fontSize: 15 },
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
  iconWrapError: {
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderColor: 'rgba(255,107,107,0.3)',
  },
  iconEmoji: { fontSize: 30 },
  title: {
    fontSize: 24, fontWeight: '800', color: '#f0f0ff',
    marginBottom: 8, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: '#888', textAlign: 'center',
    lineHeight: 21, marginBottom: 24,
  },
  emailLabel: {
    fontSize: 13, color: '#a78bfa', marginBottom: 20, textAlign: 'center',
  },
  errorBox: {
    width: '100%', backgroundColor: 'rgba(255,107,107,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#ff6b6b', fontSize: 13 },
  fieldGroup: { width: '100%', marginBottom: 16 },
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
  inputIcon: { fontSize: 16, marginRight: 10 },
  eyeBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  input: {
    flex: 1, color: '#fff', fontSize: 15,
    paddingVertical: 14, outlineWidth: 0,
  } as any,
  strengthRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    width: '100%', marginBottom: 20,
  },
  strengthBar: {
    flex: 1, height: 4, borderRadius: 2,
  },
  strengthWeak: { backgroundColor: 'rgba(255,255,255,0.1)' },
  strengthMedium: { backgroundColor: '#d97706' },
  strengthStrong: { backgroundColor: '#10b981' },
  strengthLabel: { color: '#666', fontSize: 12, marginLeft: 4, minWidth: 50 },
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
});

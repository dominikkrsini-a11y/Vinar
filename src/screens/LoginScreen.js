import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { loginWithEmail, registerWithEmail } from '../firebase/auth';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isLogin,  setIsLogin]  = useState(true);
  const [loading,  setLoading]  = useState(false);

  // Mount guard — prevents setState on unmounted component
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (isMounted.current) setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      // Navigation happens automatically via onAuthChange
      // We do NOT setLoading(false) here — component may already be gone
    } catch (error) {
      // Only update state if still on screen
      if (isMounted.current) {
        setLoading(false);
        Alert.alert('Error', error.message);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        <Text style={styles.logo}>🍷</Text>
        <Text style={styles.title}>Vinar</Text>
        <Text style={styles.subtitle}>Winemaker's Assistant</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.btnGold}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#1a0a08" />
              : <Text style={styles.btnGoldText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.btnGhostText}>
              {isLogin
                ? "Don't have an account? Register"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo:  { fontSize: 64, marginBottom: 8 },
  title: {
    fontSize: 38,
    color: colors.gold,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 40,
  },
  form:  { width: '100%' },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 13,
    color: colors.textPrimary,
    fontSize: 16,
  },
  btnGold: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnGoldText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  btnGhost: {
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnGhostText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});

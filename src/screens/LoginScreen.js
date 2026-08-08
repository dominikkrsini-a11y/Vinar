import { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { loginWithEmail, registerWithEmail } from '../firebase/auth';
import { track, EVENTS } from '../services/analytics';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { TextField } from '../components/ui/TextField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';

export default function LoginScreen() {
  const { language } = useContext(LanguageContext);
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
      Alert.alert(t(language, 'error'), t(language, 'credentialsRequired'));
      return;
    }

    if (isMounted.current) setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        track(EVENTS.SIGN_IN);
      } else {
        await registerWithEmail(email, password);
        track(EVENTS.SIGN_UP);
      }
      // Navigation happens automatically via onAuthChange
      // We do NOT setLoading(false) here — component may already be gone
    } catch (error) {
      // Only update state if still on screen
      if (isMounted.current) {
        setLoading(false);
        Alert.alert(t(language, 'error'), error.message);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenWrapper style={styles.inner}>

        <Text style={styles.logo}>🍷</Text>
        <Text style={styles.title}>{t(language, 'appName')}</Text>
        <Text style={styles.subtitle}>{t(language, 'appSubtitle')}</Text>

        <View style={styles.form}>
          <TextField
            label={t(language, 'email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t(language, 'emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <TextField
            label={t(language, 'password')}
            value={password}
            onChangeText={setPassword}
            placeholder={t(language, 'passwordPlaceholder')}
            secureTextEntry
            editable={!loading}
          />

          <PrimaryButton
            style={styles.btnGold}
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
            label={isLogin ? t(language, 'signIn') : t(language, 'register')}
          />

          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.btnGhostText}>
              {isLogin ? t(language, 'noAccount') : t(language, 'haveAccount')}
            </Text>
          </TouchableOpacity>
        </View>

      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
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
  btnGold: {
    marginTop: 24,
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

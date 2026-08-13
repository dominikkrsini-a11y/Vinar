import { useRef, useState, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { saveUserProfile } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { reportError } from '../utils/reportError';
import { track, EVENTS } from '../services/analytics';
import { setSessionPrefs } from '../services/sessionCache';

// Shown once, right after registration (language select → onboarding → app).
// Three slides — one per killer feature — so a new winemaker knows what to do
// on the dashboard instead of bouncing off an empty screen.
export default function OnboardingScreen({ onDone }) {
  const { language } = useContext(LanguageContext);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scrollRef = useRef(null);

  const slides = [
    { icon: '📋', title: t(language, 'onboardingTitle1'), sub: t(language, 'onboardingSub1') },
    { icon: '🧪', title: t(language, 'onboardingTitle2'), sub: t(language, 'onboardingSub2') },
    { icon: '💬', title: t(language, 'onboardingTitle3'), sub: t(language, 'onboardingSub3') },
  ];
  const lastPage = slides.length - 1;

  const finish = (completed) => {
    // Fire-and-forget so the flag write can't hold a new user on this screen
    // while offline; the local cache queues it.
    saveUserProfile(auth.currentUser.uid, { hasOnboarded: true }).catch((e) => {
      reportError(e, { screen: 'Onboarding', action: 'saveHasOnboarded' });
    });
    setSessionPrefs({ hasOnboarded: true });
    if (completed) track(EVENTS.ONBOARDING_COMPLETED);
    onDone();
  };

  const goNext = () => {
    if (page >= lastPage) {
      finish(true);
      return;
    }
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={() => finish(false)}>
        <Text style={styles.skipText}>{t(language, 'onboardingSkip')}</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setPage(Math.round(e.nativeEvent.contentOffset.x / width));
        }}>
        {slides.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <Text style={styles.icon}>{slide.icon}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.sub}>{slide.sub}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
          <Text style={styles.nextBtnText}>
            {page === lastPage ? t(language, 'onboardingDone') : t(language, 'onboardingNext')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  skipBtn:     { position: 'absolute', top: 56, right: 24, zIndex: 1, padding: 8 },
  skipText:    { color: colors.textMuted, fontSize: 14 },
  slide:       { flex: 1, alignItems: 'center', justifyContent: 'center',
                 paddingHorizontal: 40 },
  icon:        { fontSize: 72, marginBottom: 28 },
  title:       { fontSize: 26, color: colors.gold, fontWeight: '700',
                 textAlign: 'center', marginBottom: 14 },
  sub:         { fontSize: 15, color: colors.textMuted, textAlign: 'center',
                 lineHeight: 23 },
  footer:      { padding: 32, paddingBottom: 48 },
  dots:        { flexDirection: 'row', justifyContent: 'center', gap: 8,
                 marginBottom: 24 },
  dot:         { width: 8, height: 8, borderRadius: 4,
                 backgroundColor: colors.border },
  dotActive:   { backgroundColor: colors.gold },
  nextBtn:     { backgroundColor: colors.gold, borderRadius: 10,
                 paddingVertical: 15, alignItems: 'center' },
  nextBtnText: { color: colors.background, fontSize: 16, fontWeight: '700' },
});

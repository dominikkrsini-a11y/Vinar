import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { densityAsGL } from '../../utils/numbers';

const SCREEN_WIDTH = Dimensions.get('window').width;

const formatShortDate = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
};

export function FermentationChart({ entries, language }) {
  // Readings are normalised to g/L so a logbook mixing 1.080 and 1080 still plots
  // as one continuous curve.
  const fermEntries = [...(entries || [])]
    .map((e) => ({ ...e, densityGL: densityAsGL(e.density) }))
    .filter((e) => e.type === 'fermentation' && e.densityGL !== null)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (fermEntries.length < 2) return null;

  const CHART_H = 140;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 28;
  const PAD_LEFT = 48;
  const PAD_RIGHT = 16;
  const chartW = SCREEN_WIDTH - 32 - PAD_LEFT - PAD_RIGHT;

  const densities = fermEntries.map((e) => e.densityGL);
  const rawMin = Math.min(...densities);
  const rawMax = Math.max(...densities);
  const padding = (rawMax - rawMin) * 0.15 || 5;
  const minD = rawMin - padding;
  const maxD = rawMax + padding;
  const rangeD = maxD - minD;

  const toX = (i) => (i / (fermEntries.length - 1)) * chartW;
  const toY = (d) => PAD_TOP + ((maxD - d) / rangeD) * (CHART_H - PAD_TOP - PAD_BOTTOM);

  const points = fermEntries.map((e, i) => ({
    x: toX(i),
    y: toY(e.densityGL),
    d: e.densityGL,
    date: formatShortDate(e.createdAt),
  }));

  const yLabels = [rawMax, (rawMax + rawMin) / 2, rawMin].map((v) => ({
    value: Math.round(v).toString(),
    y: toY(v),
  }));

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>
        {language === 'hr' ? 'Gustoća — vrenje (g/L)' : 'Density — fermentation (g/L)'}
      </Text>
      <View style={{ height: CHART_H, flexDirection: 'row' }}>
        <View style={{ width: PAD_LEFT, height: CHART_H }}>
          {yLabels.map((label, i) => (
            <Text
              key={i}
              style={[
                styles.chartAxisLabel,
                { position: 'absolute', top: label.y - 7, right: 6 },
              ]}
            >
              {label.value}
            </Text>
          ))}
        </View>
        <View style={{ width: chartW + PAD_RIGHT, height: CHART_H }}>
          {yLabels.map((label, i) => (
            <View key={i} style={[styles.chartGridLine, { top: label.y, width: chartW }]} />
          ))}
          {points.slice(0, -1).map((p, i) => {
            const next = points[i + 1];
            const dx = next.x - p.x;
            const dy = next.y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={`line_${i}`}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y - 1,
                  width: len,
                  height: 2,
                  backgroundColor: colors.gold,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: '0 50%',
                }}
              />
            );
          })}
          {points.map((p, i) => (
            <View key={`dot_${i}`}>
              <View style={[styles.chartDot, { left: p.x - 5, top: p.y - 5 }]} />
              <Text style={[styles.chartDotLabel, { left: p.x - 20, top: p.y - 20 }]}>
                {Math.round(p.d)}
              </Text>
              <Text
                style={[
                  styles.chartAxisLabel,
                  {
                    position: 'absolute',
                    left: p.x - 14,
                    top: CHART_H - PAD_BOTTOM + 4,
                    width: 28,
                    textAlign: 'center',
                  },
                ]}
              >
                {p.date}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  chartGridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  chartDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.background,
  },
  chartDotLabel: {
    position: 'absolute',
    width: 40,
    fontSize: 9,
    color: colors.gold,
    textAlign: 'center',
    fontWeight: '600',
  },
  chartAxisLabel: { fontSize: 9, color: colors.textMuted },
});


import { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';

const SO2_DATA = [
  {
    type: 'white',
    rows: [
      { ph: '3.0 – 3.2', target: '20 – 25 mg/L' },
      { ph: '3.2 – 3.4', target: '25 – 30 mg/L' },
      { ph: '3.4 – 3.6', target: '30 – 35 mg/L' },
      { ph: '3.6+',      target: '35 – 40 mg/L' },
    ],
  },
  {
    type: 'red',
    rows: [
      { ph: '3.0 – 3.2', target: '12 – 18 mg/L' },
      { ph: '3.2 – 3.4', target: '18 – 22 mg/L' },
      { ph: '3.4 – 3.6', target: '22 – 28 mg/L' },
      { ph: '3.6+',      target: '28 – 35 mg/L' },
    ],
  },
  {
    type: 'sweet',
    rows: [
      { ph: '3.0 – 3.2', target: '40 – 50 mg/L' },
      { ph: '3.2 – 3.4', target: '45 – 55 mg/L' },
      { ph: '3.4 – 3.6', target: '50 – 60 mg/L' },
      { ph: '3.6+',      target: '55 – 65 mg/L' },
    ],
  },
];

const TA_DATA = [
  { typeKey: 'white', range: '5.5 – 7.5 g/L' },
  { typeKey: 'red',   range: '5.0 – 6.5 g/L' },
  { typeKey: 'rose',  range: '5.5 – 7.0 g/L' },
  { typeKey: 'sweet', range: '6.0 – 8.0 g/L' },
];

const LAB_CONTACTS = [
  {
    name: 'Hrvatski zavod za vinogradarstvo i vinarstvo',
    city: 'Čakovec',
    note: { en: 'National institute — full analysis', hr: 'Nacionalni institut — potpuna analiza' },
  },
  {
    name: 'Zavod za vinogradarstvo i vinarstvo',
    city: 'Split',
    note: { en: 'Dalmatia region — closest for most southern producers', hr: 'Dalmacija — najbliže za većinu južnih proizvođača' },
  },
  {
    name: 'Savjetodavna služba',
    city: 'Vaša lokalna poslovnica',
    note: { en: 'Agricultural extension — free advice, can direct you to nearest lab', hr: 'Besplatni savjeti, mogu vas uputiti na najbliži laboratorij' },
  },
];

export default function ReferenceScreen() {
  const { language } = useContext(LanguageContext);
  const [activeSection,  setActiveSection]  = useState('so2');
  const [activeSO2Type,  setActiveSO2Type]  = useState('white');

  const SECTIONS = [
    { key: 'so2',      label: t(language, 'so2Targets')  },
    { key: 'acidity',  label: t(language, 'acidity')     },
    { key: 'labGuide', label: t(language, 'labGuide')    },
    { key: 'labContacts', label: t(language, 'labContacts') },
  ];

  const SO2_TYPE_LABELS = {
    white: t(language, 'whiteRose'),
    red:   t(language, 'red'),
    sweet: t(language, 'sweet'),
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t(language, 'reference')}</Text>

        {/* Section tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
          {SECTIONS.map(s => (
            <TouchableOpacity key={s.key}
              style={[styles.tab, activeSection === s.key && styles.tabActive]}
              onPress={() => setActiveSection(s.key)}>
              <Text style={[styles.tabText, activeSection === s.key && styles.tabTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── SO2 TARGETS ── */}
        {activeSection === 'so2' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t(language, 'so2TableTitle')}</Text>
            <Text style={styles.cardSub}>{t(language, 'so2TableSub')}</Text>

            <View style={styles.typeRow}>
              {SO2_DATA.map(d => (
                <TouchableOpacity key={d.type}
                  style={[styles.typeBtn, activeSO2Type === d.type && styles.typeBtnActive]}
                  onPress={() => setActiveSO2Type(d.type)}>
                  <Text style={[styles.typeBtnText, activeSO2Type === d.type && styles.typeBtnTextActive]}>
                    {SO2_TYPE_LABELS[d.type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>{t(language, 'phRange')}</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>{t(language, 'freeSO2Target')}</Text>
              </View>
              {SO2_DATA.find(d => d.type === activeSO2Type)?.rows.map((row, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={styles.tableCell}>{row.ph}</Text>
                  <Text style={[styles.tableCell, styles.tableCellHighlight]}>{row.target}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.footnote}>{t(language, 'so2Footnote')}</Text>
          </View>
        )}

        {/* ── ACIDITY ── */}
        {activeSection === 'acidity' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t(language, 'taTitle')}</Text>
            <Text style={styles.cardSub}>{t(language, 'taSub')}</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>{t(language, 'wineType')}</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>{t(language, 'targetTA')}</Text>
              </View>
              {TA_DATA.map((row, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={styles.tableCell}>{t(language, row.typeKey)}</Text>
                  <Text style={[styles.tableCell, styles.tableCellHighlight]}>{row.range}</Text>
                </View>
              ))}
            </View>
            <View style={styles.warningBox}>
              <Text style={styles.warningBoxText}>{t(language, 'taWarning')}</Text>
            </View>
          </View>
        )}

        {/* ── LAB GUIDE ── */}
        {activeSection === 'labGuide' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t(language, 'labGuideTitle')}</Text>
            <Text style={styles.cardSub}>{t(language, 'labGuideSub')}</Text>
            {t(language, 'labWhen').map((item, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listBullet}>
                  <Text style={styles.listBulletText}>{i + 1}</Text>
                </View>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── LAB CONTACTS ── */}
        {activeSection === 'labContacts' && (
          <View>
            <Text style={styles.cardTitle}>{t(language, 'labContactsTitle')}</Text>
            <Text style={[styles.cardSub, { marginBottom: 16 }]}>{t(language, 'labContactsSub')}</Text>
            {LAB_CONTACTS.map((lab, i) => (
              <View key={i} style={styles.labCard}>
                <Text style={styles.labName}>{lab.name}</Text>
                <Text style={styles.labCity}>📍 {lab.city}</Text>
                <Text style={styles.labNote}>{lab.note[language] || lab.note.en}</Text>
              </View>
            ))}
            <View style={styles.warningBox}>
              <Text style={styles.warningBoxText}>{t(language, 'labContactsTip')}</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  scroll:             { flex: 1 },
  content:            { padding: 24, paddingBottom: 60 },
  title:              { fontSize: 28, color: colors.gold, fontWeight: '700', marginBottom: 16 },
  tabsScroll:         { marginBottom: 20 },
  tabs:               { flexDirection: 'row', gap: 8, paddingRight: 24 },
  tab:                { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
                        backgroundColor: colors.surface, borderWidth: 1,
                        borderColor: colors.border },
  tabActive:          { backgroundColor: colors.surfaceDeep, borderColor: colors.gold },
  tabText:            { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  tabTextActive:      { color: colors.gold },
  card:               { backgroundColor: colors.surface, borderRadius: 12,
                        borderWidth: 1, borderColor: colors.border, padding: 18 },
  cardTitle:          { fontSize: 18, color: colors.textPrimary,
                        fontWeight: '700', marginBottom: 6 },
  cardSub:            { fontSize: 13, color: colors.textMuted,
                        lineHeight: 19, marginBottom: 16 },
  typeRow:            { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  typeBtn:            { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
                        backgroundColor: colors.surfaceDeep, borderWidth: 1,
                        borderColor: colors.border },
  typeBtnActive:      { borderColor: colors.gold },
  typeBtnText:        { fontSize: 12, color: colors.textMuted },
  typeBtnTextActive:  { color: colors.gold },
  table:              { borderRadius: 8, overflow: 'hidden',
                        borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  tableRow:           { flexDirection: 'row' },
  tableRowAlt:        { backgroundColor: colors.surfaceDeep },
  tableHeader:        { backgroundColor: colors.border },
  tableHeaderText:    { color: colors.textPrimary, fontWeight: '700' },
  tableCell:          { flex: 1, padding: 12, fontSize: 14, color: colors.textMuted },
  tableCellHighlight: { color: colors.gold, fontWeight: '600' },
  footnote:           { fontSize: 12, color: colors.textMuted,
                        fontStyle: 'italic', lineHeight: 18 },
  warningBox:         { backgroundColor: colors.surfaceDeep, borderRadius: 8,
                        borderWidth: 1, borderColor: '#7a4a00',
                        padding: 12, marginTop: 14 },
  warningBoxText:     { fontSize: 12, color: '#c8902a', lineHeight: 18 },
  listItem:           { flexDirection: 'row', alignItems: 'flex-start',
                        marginBottom: 14, gap: 12 },
  listBullet:         { width: 26, height: 26, borderRadius: 13,
                        backgroundColor: colors.surfaceDeep, borderWidth: 1,
                        borderColor: colors.gold, alignItems: 'center',
                        justifyContent: 'center', marginTop: 1 },
  listBulletText:     { fontSize: 12, color: colors.gold, fontWeight: '700' },
  listText:           { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 21 },
  labCard:            { backgroundColor: colors.surface, borderRadius: 10,
                        borderWidth: 1, borderColor: colors.border,
                        padding: 16, marginBottom: 12 },
  labName:            { fontSize: 15, color: colors.textPrimary,
                        fontWeight: '700', marginBottom: 6 },
  labCity:            { fontSize: 13, color: colors.gold, marginBottom: 4 },
  labNote:            { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});

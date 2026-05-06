import { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { getUserProfile, getWines, getEntries } from '../firebase/firestore';
import { winemakerKnowledge } from '../data/winemakerKnowledge';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';

const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY 
  || Constants.expoConfig?.extra?.anthropicApiKey;

const buildSystemPrompt = (profile, wines, entries) => {
  const wineList = wines.map(w => {
    const wineEntries = entries[w.id] || [];
    const entryText = wineEntries.slice(0, 5).map(e => {
      if (e.type === 'fermentation') {
        return `  - Fermentation (${e.createdAt?.slice(0,10)}): temp ${e.temperature || '?'}°C, density ${e.density || '?'}, sugar ${e.sugar || '?'}${e.ph ? `, pH ${e.ph}` : ''}${e.yeast ? `, yeast: ${e.yeast}` : ''}`;
      }
      if (e.type === 'sulfur') {
        return `  - SO₂ addition (${e.createdAt?.slice(0,10)}): ${e.amount || '?'} g/hL, product: ${e.product || '?'}${e.freeSo2 ? `, free SO₂ before: ${e.freeSo2} ppm` : ''}${e.ph ? `, pH ${e.ph}` : ''}`;
      }
      return `  - Note (${e.createdAt?.slice(0,10)}): ${e.notes || ''}`;
    }).join('\n');
    return `Wine: ${w.name} (${w.type || ''}, ${w.grape || ''}, ${w.vintage || ''}${w.volume ? `, ${w.volume}L` : ''})
${wineEntries.length > 0 ? 'Recent logbook entries:\n' + entryText : 'No logbook entries yet.'}`;
  }).join('\n\n');

  return `You are a professional winemaking assistant for small Croatian wine producers.
You speak both English and Croatian — always respond in the same language the user writes in.
You are helping ${profile?.firstName || 'a winemaker'} ${profile?.lastName || ''} from ${profile?.wineryName || 'their winery'} in ${profile?.region || 'Croatia'}.

WINEMAKER'S CURRENT WINES AND LOGBOOK:
${wineList || 'No wines added yet.'}

YOUR ROLE:
- Give specific, practical advice based on the user's actual wines and logbook data
- Always ask follow-up questions before recommending yeasts or products
- Reference their specific wines when relevant
- Recommend only products available from Croatian suppliers
- Always recommend lab testing for certified results
- If you notice something concerning in their logbook data, mention it proactively

APP NAVIGATION HELP:
If user asks how to use the app, explain clearly:
- "Kako dodati vino / How to add wine" → tap dashboard → tap Add Wine card
- "Kako dodati unos / How to add entry" → tap a wine → tap + button bottom right
- "Kako koristiti kalkulator / How to use calculator" → tap Calculator tab
- "Kako objaviti oglas / How to post listing" → tap Marketplace → tap + Objavi
- "Kako promijeniti jezik / How to change language" → tap Profile tab → Language section

IMAGE ANALYSIS — When user sends a photo:

PRODUCT LABELS:
- Read all visible text carefully
- Identify the product type (yeast, enzyme, fining agent, SO₂ product, nutrient, etc.)
- Extract: product name, active ingredient, manufacturer
- Calculate correct dosage for the user's wine volume if they mention it
- Warn about any incompatibilities or timing requirements
- Common Croatian/EU products: Vinobran (potassium metabisulfite), Vinostab (CMC), various Lallemand/Erbslöh/Lamothe products

VINEYARD PHOTOS — DISEASES:
- Peronospora (Downy mildew): Yellow oil spots on upper leaf, white fungal growth underneath. Treat with copper-based products.
- Oidium (Powdery mildew): White powdery coating on leaves, shoots, grapes. Treat with sulfur.
- Botrytis (Grey rot): Grey fuzzy mold on grapes, brown soft spots. Remove affected bunches immediately.
- Black rot (Crna trulež): Brown circular spots with black dots on leaves, mummified black grapes.
- Phomopsis: Dark lesions at base of shoots in spring.
- Eutypa: Dead arm, fan-shaped yellowing.

VINEYARD PHOTOS — NUTRITION DEFICIENCIES:
- Yellow leaves with green veins (interveinal chlorosis) → Iron or Manganese deficiency
- General yellowing of older leaves → Nitrogen deficiency
- Purple/red coloration on leaves → Phosphorus deficiency
- Brown leaf edges → Potassium deficiency or drought stress
- Small distorted leaves → Zinc deficiency

VINEYARD PHOTOS — PRUNING:
- Assess cut quality — clean cuts heal faster
- Check for correct bud count per cane
- Identify variety-specific training systems (Dalmatian varieties often use Guyot or local systems)
- Flag any signs of wood disease at pruning cuts

HARVEST READINESS:
- Assess grape color, berry firmness, seed color (green→brown = ripe)
- Look for signs of disease or botrytis
- Estimate ripeness stage

DALMATIAN VARIETIES CONTEXT:
- Grk: Sandy soils Lumbarda, female flowers, pollinated by Plavac Mali, high sugar/acid balance, bitter almond finish
- Pošip: Korčula, high alcohol, viscous, citrus/apricot, ages well
- Plavac Mali: Thick skin, late ripening, high tannin/alcohol, uneven ripening common
- Babić: Primošten, high acidity, Marasca cherry, granite minerality
- Teran: Istria, iron-rich soils, high acidity, raspberry/iron profile
- Malvazija: Istria, acacia blossom, stone fruit, bitter almond
- Graševina: Continental, green apple/chamomile, versatile

YEAST RECOMMENDATIONS:
- Grk: Lalvin QA23 or Fermivin TS28 (Pa-vin) — preserves mineral/almond character
- Pošip: Lalvin ICV D-47 or Fermivin 4F9 for body; QA23 for fresh style
- Plavac Mali: Uvaferm BDX (standard); Siha 10 Red Roman for dark chocolate/ripe fruit
- Babić: Uvaferm BDX or Uvaferm 299
- Teran: Lalvin BDX for still; EnartisFerm Perlage for sparkling

CROATIAN SUPPLIERS:
1. Pa-vin — pavin.hr — Lallemand yeasts, DIAM corks, equipment (Jastrebarsko)
2. Horvat Univerzal — vinarska-oprema.com — processing, filtration, lab (Varaždin)
3. Kokot Eno — kokoteno.hr — Lamothe-Abiet products, barrels, cellar tools (Jastrebarsko)
4. Vinoartis — vinoartis.hr — enology, viticulture, lab analysis (Višnjan)
5. Letina Inox — letina.com — stainless steel tanks all sizes (Čakovec)
6. Poljocentar — poljocentar.hr — retail, hobbyist supplies (national)

IMPORTANT RULES:
- Always ask what style before recommending yeast
- Never recommend yeast without knowing fermentation temperature
- For SO₂ always reference logbook data if available
- Do not give medical advice
- Recommend lab testing for complex problems
- Always mention which Croatian supplier carries recommended products
- For oxidation questions: consider wine type, temperature, tank fullness, fermentation stage

${winemakerKnowledge}`;
};

export default function AssistantScreen() {
  const { language } = useContext(LanguageContext);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [loadingCtx,  setLoadingCtx]  = useState(true);
  const [profile,     setProfile]     = useState(null);
  const [wines,       setWines]       = useState([]);
  const [entries,     setEntries]     = useState({});
  const [pendingImage, setPendingImage] = useState(null);
  const scrollRef = useRef(null);
  const dbgRunIdRef = useRef(`run_${Date.now()}_${Math.random().toString(16).slice(2)}`);

  useEffect(() => { loadContext(); }, []);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const loadContext = async () => {
    try {
      const uid = auth.currentUser.uid;
      const [profileData, winesData] = await Promise.all([
        getUserProfile(uid),
        getWines(uid),
      ]);
      setProfile(profileData);
      setWines(winesData);
      const entriesMap = {};
      await Promise.all(winesData.map(async w => {
        const e = await getEntries(uid, w.id);
        entriesMap[w.id] = e.slice(0, 5);
      }));
      setEntries(entriesMap);
    } catch (e) {
      console.log('Error loading context:', e);
    } finally {
      setLoadingCtx(false);
    }
  };

  const handleCamera = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7448/ingest/2aefacc4-8e4c-4680-a3a4-6e8a6f5530a7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e6554b'},body:JSON.stringify({sessionId:'e6554b',runId:dbgRunIdRef.current,hypothesisId:'H3',location:'AssistantScreen.js:handleCamera:start',message:'handleCamera pressed',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        language === 'hr' ? 'Dozvola odbijena' : 'Permission denied',
        language === 'hr' ? 'Trebamo pristup kameri.' : 'We need access to your camera.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.6,
    });
    if (!result.canceled) {
      // #region agent log
      fetch('http://127.0.0.1:7448/ingest/2aefacc4-8e4c-4680-a3a4-6e8a6f5530a7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e6554b'},body:JSON.stringify({sessionId:'e6554b',runId:dbgRunIdRef.current,hypothesisId:'H3',location:'AssistantScreen.js:handleCamera:asset',message:'camera asset selected',data:{uri:result?.assets?.[0]?.uri||null,canceled:result?.canceled},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setPendingImage(result.assets[0]);
    }
  };

  const imageToBase64 = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return base64;
  };

  const sendMessage = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7448/ingest/2aefacc4-8e4c-4680-a3a4-6e8a6f5530a7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e6554b'},body:JSON.stringify({sessionId:'e6554b',runId:dbgRunIdRef.current,hypothesisId:'H1',location:'AssistantScreen.js:sendMessage:enter',message:'sendMessage called',data:{hasText:!!input.trim(),hasPendingImage:!!pendingImage,loading,pendingImageUri:pendingImage?.uri||null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if ((!input.trim() && !pendingImage) || loading) return;

    const userContent = [];
    let displayImage = null;

    if (pendingImage) {
      console.log('Converting image to base64...');
      displayImage = pendingImage.uri;
      try {
        // #region agent log
        fetch('http://127.0.0.1:7448/ingest/2aefacc4-8e4c-4680-a3a4-6e8a6f5530a7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e6554b'},body:JSON.stringify({sessionId:'e6554b',runId:dbgRunIdRef.current,hypothesisId:'H2',location:'AssistantScreen.js:sendMessage:beforeBase64',message:'starting base64 conversion',data:{uri:pendingImage?.uri||null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const base64data = await imageToBase64(pendingImage.uri);
        console.log('Base64 length:', base64data?.length);
        // #region agent log
        fetch('http://127.0.0.1:7448/ingest/2aefacc4-8e4c-4680-a3a4-6e8a6f5530a7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e6554b'},body:JSON.stringify({sessionId:'e6554b',runId:dbgRunIdRef.current,hypothesisId:'H2',location:'AssistantScreen.js:sendMessage:afterBase64',message:'base64 conversion finished',data:{len:base64data?.length||0},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: base64data,
          },
        });
      } catch (imgError) {
        console.log('Image conversion error:', imgError);
        // #region agent log
        fetch('http://127.0.0.1:7448/ingest/2aefacc4-8e4c-4680-a3a4-6e8a6f5530a7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e6554b'},body:JSON.stringify({sessionId:'e6554b',runId:dbgRunIdRef.current,hypothesisId:'H2',location:'AssistantScreen.js:sendMessage:base64Error',message:'base64 conversion error',data:{name:imgError?.name||null,message:String(imgError?.message||imgError||'')},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      }
    }

    if (input.trim()) {
      userContent.push({ type: 'text', text: input.trim() });
    } else if (pendingImage) {
      userContent.push({
        type: 'text',
        text: language === 'hr' ? 'Što možete reći o ovoj slici?' : 'What can you tell me about this image?',
      });
    }

    const userMessage = { role: 'user', content: userContent, displayImage };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setPendingImage(null);
    setLoading(true);

    try {
      console.log('sendMessage started, pendingImage:', pendingImage?.uri);
      // #region agent log
      fetch('http://127.0.0.1:7448/ingest/2aefacc4-8e4c-4680-a3a4-6e8a6f5530a7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e6554b'},body:JSON.stringify({sessionId:'e6554b',runId:dbgRunIdRef.current,hypothesisId:'H4',location:'AssistantScreen.js:sendMessage:beforeFetch',message:'about to call Anthropic API',data:{contentTypes:userContent.map(c=>c.type),hasDisplayImage:!!displayImage},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const apiMessages = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system:     buildSystemPrompt(profile, wines, entries),
          messages:   apiMessages,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      // #region agent log
      fetch('http://127.0.0.1:7448/ingest/2aefacc4-8e4c-4680-a3a4-6e8a6f5530a7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e6554b'},body:JSON.stringify({sessionId:'e6554b',runId:dbgRunIdRef.current,hypothesisId:'H4',location:'AssistantScreen.js:sendMessage:afterFetch',message:'Anthropic API success',data:{hasContent:!!data?.content?.[0]?.text},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      setMessages(prev => [...prev, {
        role:    'assistant',
        content: [{ type: 'text', text: data.content[0].text }],
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: [{ type: 'text', text: t(language, 'errorMsg') }],
      }]);
      console.log('API error:', e);
      // #region agent log
      fetch('http://127.0.0.1:7448/ingest/2aefacc4-8e4c-4680-a3a4-6e8a6f5530a7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e6554b'},body:JSON.stringify({sessionId:'e6554b',runId:dbgRunIdRef.current,hypothesisId:'H4',location:'AssistantScreen.js:sendMessage:apiError',message:'Anthropic API error',data:{name:e?.name||null,message:String(e?.message||e||'')},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (msg, i) => {
    const isUser = msg.role === 'user';
    const textContent = Array.isArray(msg.content)
      ? msg.content.find(c => c.type === 'text')?.text || ''
      : msg.content;

    return (
      <View key={i} style={[
        styles.bubbleWrapper,
        isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAssistant,
      ]}>
        {msg.displayImage && (
          <Image source={{ uri: msg.displayImage }}
            style={styles.chatImage} resizeMode="cover" />
        )}
        {textContent ? (
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text selectable style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
            ]}>
              {textContent}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loadingCtx) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t(language, 'assistantTitle')}</Text>
          <Text style={styles.headerSub}>{t(language, 'assistantSub')}</Text>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={styles.messages}
          contentContainerStyle={styles.messagesContent}>

          {messages.length === 0 && (
            <View style={styles.welcome}>
              <Text style={styles.welcomeTitle}>
                {language === 'hr' ? 'Dobro došli' : 'Welcome'}{profile?.firstName ? `, ${profile.firstName}` : ''}!
              </Text>
              <Text style={styles.welcomeText}>{t(language, 'welcomeMsg')}</Text>
              <View style={styles.suggestions}>
                {[
                  t(language, 'suggestion1'),
                  t(language, 'suggestion2'),
                  t(language, 'suggestion3'),
                  t(language, 'suggestion4'),
                ].map((s, i) => (
                  <TouchableOpacity key={i} style={styles.chip}
                    onPress={() => setInput(s)}>
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, i) => renderMessage(msg, i))}

          {loading && (
            <View style={[styles.bubble, styles.bubbleAssistant, { alignSelf: 'flex-start' }]}>
              <ActivityIndicator color={colors.gold} size="small" />
            </View>
          )}

        </ScrollView>

        {/* Pending image preview */}
        {pendingImage && (
          <View style={styles.pendingImageContainer}>
            <Image source={{ uri: pendingImage.uri }} style={styles.pendingImage} />
            <TouchableOpacity style={styles.removePending}
              onPress={() => setPendingImage(null)}>
              <Text style={styles.removePendingText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.plusBtn} onPress={handleCamera}>
            <Text style={styles.plusBtnText}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t(language, 'askPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (((!input.trim() && !pendingImage) || loading)) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={(!input.trim() && !pendingImage) || loading}>
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: colors.background },
  center:                 { flex: 1, backgroundColor: colors.background,
                            alignItems: 'center', justifyContent: 'center' },
  header:                 { padding: 20, paddingTop: 52,
                            backgroundColor: colors.surface,
                            borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:            { fontSize: 18, color: colors.gold, fontWeight: '700' },
  headerSub:              { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  messages:               { flex: 1 },
  messagesContent:        { padding: 16, paddingBottom: 8 },
  welcome:                { alignItems: 'center', paddingTop: 20, paddingBottom: 10 },
  welcomeTitle:           { fontSize: 20, color: colors.gold,
                            fontWeight: '700', marginBottom: 8 },
  welcomeText:            { fontSize: 14, color: colors.textMuted,
                            textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  suggestions:            { flexDirection: 'row', flexWrap: 'wrap',
                            gap: 8, justifyContent: 'center' },
  chip:                   { backgroundColor: colors.surface, borderRadius: 16,
                            borderWidth: 1, borderColor: colors.border,
                            paddingVertical: 6, paddingHorizontal: 12 },
  chipText:               { fontSize: 13, color: colors.textMuted },
  bubbleWrapper:          { marginBottom: 10 },
  bubbleWrapperUser:      { alignItems: 'flex-end' },
  bubbleWrapperAssistant: { alignItems: 'flex-start' },
  bubble:                 { maxWidth: '85%', borderRadius: 16, padding: 12 },
  bubbleUser:             { backgroundColor: colors.gold, borderBottomRightRadius: 4 },
  bubbleAssistant:        { backgroundColor: colors.surface, borderBottomLeftRadius: 4,
                            borderWidth: 1, borderColor: colors.border,
                            minWidth: 50, alignItems: 'center' },
  bubbleText:             { fontSize: 14, lineHeight: 20 },
  bubbleTextUser:         { color: colors.background, fontWeight: '500' },
  bubbleTextAssistant:    { color: colors.textPrimary },
  chatImage:              { width: 220, height: 160, borderRadius: 12, marginBottom: 6 },
  pendingImageContainer:  { margin: 12, position: 'relative', alignSelf: 'flex-end' },
  pendingImage:           { width: 80, height: 80, borderRadius: 8 },
  removePending:          { position: 'absolute', top: -6, right: -6,
                            backgroundColor: colors.surface, borderRadius: 10,
                            width: 20, height: 20, alignItems: 'center',
                            justifyContent: 'center', borderWidth: 1,
                            borderColor: colors.border },
  removePendingText:      { color: colors.textMuted, fontSize: 12 },
  inputRow:               { flexDirection: 'row', padding: 12,
                            backgroundColor: colors.surface,
                            borderTopWidth: 1, borderTopColor: colors.border,
                            gap: 8, alignItems: 'flex-end' },
  plusBtn:                { width: 42, height: 42, borderRadius: 21,
                            backgroundColor: colors.surfaceDeep,
                            borderWidth: 1, borderColor: colors.border,
                            alignItems: 'center', justifyContent: 'center' },
  plusBtnText:            { fontSize: 24, color: colors.textMuted, lineHeight: 28 },
  input:                  { flex: 1, backgroundColor: colors.surfaceDeep,
                            borderWidth: 1, borderColor: colors.border,
                            borderRadius: 20, paddingHorizontal: 16,
                            paddingVertical: 10, color: colors.textPrimary,
                            fontSize: 15, maxHeight: 100 },
  sendBtn:                { width: 42, height: 42, borderRadius: 21,
                            backgroundColor: colors.gold,
                            alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:        { opacity: 0.4 },
  sendBtnText:            { fontSize: 20, color: colors.background, fontWeight: '700' },
});

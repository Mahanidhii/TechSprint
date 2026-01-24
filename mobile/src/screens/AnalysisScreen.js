import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import * as Speech from 'expo-speech';
import { apiService } from '../services/apiService';

export default function AnalysisScreen({ route, navigation }) {
  const { document } = route.params;
  const [analysis, setAnalysis] = useState(null);
  const [translatedAnalysis, setTranslatedAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [languages, setLanguages] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentAnalysis = translatedAnalysis || analysis;

  useEffect(() => {
    fetchAnalysis();
    fetchLanguages();

    return () => {
      Speech.stop();
    };
  }, []);

  const fetchAnalysis = async () => {
    try {
      console.log('Fetching analysis for document:', document._id);
      const data = await apiService.analyzeDocument(document._id);
      console.log('Analysis received:', data);
      setAnalysis(data);
    } catch (error) {
      console.error('Error analyzing document:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert(
        'Error', 
        error.response?.data?.error || 'Failed to analyze document. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchLanguages = async () => {
    try {
      const data = await apiService.getLanguages();
      setLanguages(data.languages || {});
    } catch (error) {
      console.error('Failed to fetch languages:', error);
    }
  };

  const handleLanguageChange = async (lang) => {
    setSelectedLanguage(lang);

    await Speech.stop();
    setIsSpeaking(false);

    if (lang === 'en') {
      setTranslatedAnalysis(null);
      return;
    }

    if (!analysis) {
      Alert.alert('Error', 'Please wait for analysis to load first');
      setSelectedLanguage('en');
      return;
    }

    setTranslating(true);
    try {
      console.log('Translating to:', lang);
      console.log('Analysis data:', JSON.stringify(analysis, null, 2));
      const data = await apiService.translateAnalysis(analysis, lang);
      console.log('Translation result:', data);
      setTranslatedAnalysis(data.translated_analysis);
    } catch (error) {
      console.error('Translation error:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert(
        'Error', 
        error.response?.data?.error || error.message || 'Translation failed. Please try again.'
      );
      setSelectedLanguage('en');
      setTranslatedAnalysis(null);
    } finally {
      setTranslating(false);
    }
  };

  const handleTextToSpeech = async () => {
    if (!currentAnalysis || !currentAnalysis.plain_summary) {
      Alert.alert('Error', 'No summary available to read');
      return;
    }

    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }

    const languageMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'ru': 'ru-RU',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'zh': 'zh-CN',
      'ar': 'ar-SA',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'ml': 'ml-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'pa': 'pa-IN',
      'nl': 'nl-NL',
      'pl': 'pl-PL',
      'tr': 'tr-TR',
      'vi': 'vi-VN',
      'th': 'th-TH',
      'id': 'id-ID',
      'he': 'he-IL',
      'sv': 'sv-SE',
      'no': 'nb-NO',
      'da': 'da-DK',
      'fi': 'fi-FI',
    };

    const ttsLanguage = languageMap[selectedLanguage] || 'en-US';

    setIsSpeaking(true);
    
    Speech.speak(currentAnalysis.plain_summary, {
      language: ttsLanguage,
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false);
        Alert.alert('Error', 'Text-to-speech failed');
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00838d" />
        <Text style={styles.loadingText}>Analyzing document...</Text>
      </View>
    );
  }

  if (!currentAnalysis) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No analysis data available</Text>
      </View>
    );
  }

  const languageItems = Object.entries(languages).map(([code, name]) => ({
    label: name,
    value: code,
  }));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{analysis.title}</Text>
          <Text style={styles.date}>
            Analyzed on {new Date(analysis.analyzed_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.languageSelector}>
          <View style={styles.languageHeader}>
            <Text style={styles.languageIcon}>🌐</Text>
            <Text style={styles.languageTitle}>Translate to:</Text>
          </View>
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              onValueChange={handleLanguageChange}
              items={languageItems}
              value={selectedLanguage}
              style={pickerSelectStyles}
              placeholder={{}}
              disabled={translating}
            />
            {translating && (
              <View style={styles.translatingIndicator}>
                <ActivityIndicator size="small" color="#00838d" />
                <Text style={styles.translatingText}>Translating...</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Plain Summary */}
      <View style={styles.section}>
        <View style={styles.summaryHeader}>
          <Text style={styles.sectionTitle}>Plain Language Summary</Text>
          <TouchableOpacity
            style={[styles.speakerButton, isSpeaking && styles.speakerButtonActive]}
            onPress={handleTextToSpeech}
            disabled={translating}
          >
            <Text style={styles.speakerIcon}>{isSpeaking ? '⏸️' : '🔊'}</Text>
            <Text style={styles.speakerText}>
              {isSpeaking ? 'Stop' : 'Listen'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>
            {currentAnalysis.plain_summary || 'No summary available'}
          </Text>
        </View>
      </View>

      {/* Key Terms */}
      {currentAnalysis.key_terms && currentAnalysis.key_terms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Terms Explained</Text>
          {currentAnalysis.key_terms.map((item, index) => (
            <View key={index} style={styles.termCard}>
              <Text style={styles.termTitle}>{item.term}</Text>
              <Text style={styles.termText}>{item.explanation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Important Clauses */}
      {currentAnalysis.important_clauses &&
        currentAnalysis.important_clauses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Important Clauses</Text>
            {currentAnalysis.important_clauses.map((item, index) => (
              <View key={index} style={styles.clauseCard}>
                {item.section && (
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{item.section}</Text>
                  </View>
                )}
                <Text style={styles.clauseText}>"{item.clause}"</Text>
                <Text style={styles.clauseExplanation}>
                  <Text style={styles.bold}>Why this matters:</Text>{' '}
                  {item.explanation}
                </Text>
              </View>
            ))}
          </View>
        )}

      {/* Risks and Concerns */}
      {currentAnalysis.risks_and_concerns &&
        currentAnalysis.risks_and_concerns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Potential Risks & Concerns</Text>
            {currentAnalysis.risks_and_concerns.map((item, index) => (
              <View key={index} style={styles.riskCard}>
                <View style={styles.riskHeader}>
                  <Text style={styles.riskIcon}>!</Text>
                  <Text style={styles.riskTitle}>{item.risk}</Text>
                </View>
                <Text style={styles.riskText}>{item.explanation}</Text>
              </View>
            ))}
          </View>
        )}

      {/* Unclear Items */}
      {currentAnalysis.unclear_items &&
        currentAnalysis.unclear_items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Unclear or Missing Information</Text>
            {currentAnalysis.unclear_items.map((item, index) => (
              <View key={index} style={styles.unclearItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.unclearText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          <Text style={styles.bold}>Important Disclaimer:</Text> This analysis
          provides simplified explanations based solely on the document text
          provided. It does not constitute legal, medical, or financial advice.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  languageSelector: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00838d',
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  languageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00838d',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00838d',
    minHeight: 45,
    justifyContent: 'center',
  },
  translatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#fff3e0',
    marginTop: 8,
    borderRadius: 8,
  },
  translatingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#00838d',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  speakerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00838d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  speakerButtonActive: {
    backgroundColor: '#ff6b6b',
  },
  speakerIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  speakerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryBox: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#00838d',
    padding: 16,
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  termCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  termTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00838d',
    marginBottom: 4,
  },
  termText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  clauseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#00838d',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  sectionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  clauseText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#555',
    marginBottom: 8,
  },
  clauseExplanation: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  riskCard: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskIcon: {
    fontSize: 20,
    color: '#ff6b6b',
    marginRight: 8,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  riskText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unclearItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  unclearText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  disclaimer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#333',
    paddingRight: 30,
    fontWeight: '500',
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#333',
    paddingRight: 30,
    fontWeight: '500',
  },
  iconContainer: {
    top: 12,
    right: 12,
  },
  placeholder: {
    color: '#999',
  },
});

import React, { useState, useEffect } from 'react';
import './AnalysisView.css';

function AnalysisView({ analysis, document, onBack, apiUrl, token }) {
  const [languages, setLanguages] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translatedAnalysis, setTranslatedAnalysis] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);

  const currentAnalysis = translatedAnalysis || analysis;

  useEffect(() => {
    fetch(`${apiUrl}/languages`)
      .then(response => response.json())
      .then(data => {
        setLanguages(data.languages || {});
      })
      .catch(error => {
        console.error('Failed to fetch languages:', error);
      });
  }, [apiUrl]);

  const handleLanguageChange = async (e) => {
    const targetLang = e.target.value;
    setSelectedLanguage(targetLang);
    setTranslationError(null);

    if (targetLang === 'en') {
      setTranslatedAnalysis(null);
      return;
    }

    setIsTranslating(true);

    try {
      const response = await fetch(`${apiUrl}/translate-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          analysis: analysis,
          target_lang: targetLang
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTranslatedAnalysis(data.translated_analysis);
      } else {
        setTranslationError(data.error || 'Translation failed');
        setSelectedLanguage('en');
        setTranslatedAnalysis(null);
      }
    } catch (error) {
      setTranslationError('Failed to translate. Please try again.');
      setSelectedLanguage('en');
      setTranslatedAnalysis(null);
    } finally {
      setIsTranslating(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!analysis) {
    return (
      <div className="analysis-view">
        <div className="card">
          <p>No analysis data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-view">
      <div className="back-button-container">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Documents
        </button>
      </div>

      <div className="card">
        <div className="analysis-header">
          <div className="header-content">
            <h2>Analysis: {analysis.title}</h2>
            <p className="analysis-date">Analyzed on {formatDate(analysis.analyzed_at)}</p>
          </div>
          
          <div className="language-selector">
            <label htmlFor="language-select">
              <span className="language-icon">🌐</span> Language:
            </label>
            <select 
              id="language-select"
              value={selectedLanguage} 
              onChange={handleLanguageChange}
              disabled={isTranslating}
            >
              {Object.entries(languages).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            {isTranslating && <span className="translating-spinner">⟳</span>}
          </div>
        </div>

        {translationError && (
          <div className="translation-error">
            ⚠️ {translationError}
          </div>
        )}

        {/* Plain Language Summary */}
        <section className="analysis-section summary-section">
          <h3>Plain Language Summary</h3>
          <div className="summary-box">
            {currentAnalysis.plain_summary ? (
              <p>{currentAnalysis.plain_summary}</p>
            ) : (
              <p className="no-data">No summary available. The AI may not have generated a summary for this document.</p>
            )}
          </div>
        </section>

        {/* Key Terms */}
        {currentAnalysis.key_terms && currentAnalysis.key_terms.length > 0 && (
          <section className="analysis-section">
            <h3>Key Terms Explained</h3>
            <div className="terms-grid">
              {currentAnalysis.key_terms.map((item, index) => (
                <div key={index} className="term-card">
                  <h4>{item.term}</h4>
                  <p>{item.explanation}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Important Clauses */}
        {currentAnalysis.important_clauses && currentAnalysis.important_clauses.length > 0 && (
          <section className="analysis-section">
            <h3>Important Clauses</h3>
            {currentAnalysis.important_clauses.map((item, index) => (
              <div key={index} className="clause-card">
                {item.section && (
                  <span className="section-badge">{item.section}</span>
                )}
                <div className="clause-content">
                  <p className="clause-text">"{item.clause}"</p>
                  <p className="clause-explanation">
                    <strong>Why this matters:</strong> {item.explanation}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Risks and Concerns */}
        {currentAnalysis.risks_and_concerns && currentAnalysis.risks_and_concerns.length > 0 && (
          <section className="analysis-section risks-section">
            <h3>Potential Risks & Concerns</h3>
            {currentAnalysis.risks_and_concerns.map((item, index) => (
              <div key={index} className="risk-card">
                <div className="risk-header">
                  <span className="risk-icon">!</span>
                  <h4>{item.risk}</h4>
                </div>
                <p>{item.explanation}</p>
              </div>
            ))}
          </section>
        )}

        {/* Unclear Items */}
        {currentAnalysis.unclear_items && currentAnalysis.unclear_items.length > 0 && (
          <section className="analysis-section unclear-section">
            <h3>Unclear or Missing Information</h3>
            <ul className="unclear-list">
              {currentAnalysis.unclear_items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Disclaimer */}
        <div className="disclaimer">
          <p>
            <strong>Important Disclaimer:</strong> This analysis provides simplified explanations 
            based solely on the document text provided. It does not constitute legal, medical, or 
            financial advice. For professional guidance, please consult a qualified expert in the 
            relevant field.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AnalysisView;

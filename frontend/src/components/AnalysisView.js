import React from 'react';
import './AnalysisView.css';

function AnalysisView({ analysis, document, onBack }) {
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
          <h2>Analysis: {analysis.title}</h2>
          <p className="analysis-date">Analyzed on {formatDate(analysis.analyzed_at)}</p>
        </div>

        {/* Plain Language Summary */}
        <section className="analysis-section summary-section">
          <h3>Plain Language Summary</h3>
          <div className="summary-box">
            {analysis.plain_summary ? (
              <p>{analysis.plain_summary}</p>
            ) : (
              <p className="no-data">No summary available. The AI may not have generated a summary for this document.</p>
            )}
          </div>
        </section>

        {/* Key Terms */}
        {analysis.key_terms && analysis.key_terms.length > 0 && (
          <section className="analysis-section">
            <h3>Key Terms Explained</h3>
            <div className="terms-grid">
              {analysis.key_terms.map((item, index) => (
                <div key={index} className="term-card">
                  <h4>{item.term}</h4>
                  <p>{item.explanation}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Important Clauses */}
        {analysis.important_clauses && analysis.important_clauses.length > 0 && (
          <section className="analysis-section">
            <h3>Important Clauses</h3>
            {analysis.important_clauses.map((item, index) => (
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
        {analysis.risks_and_concerns && analysis.risks_and_concerns.length > 0 && (
          <section className="analysis-section risks-section">
            <h3>Potential Risks & Concerns</h3>
            {analysis.risks_and_concerns.map((item, index) => (
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
        {analysis.unclear_items && analysis.unclear_items.length > 0 && (
          <section className="analysis-section unclear-section">
            <h3>Unclear or Missing Information</h3>
            <ul className="unclear-list">
              {analysis.unclear_items.map((item, index) => (
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

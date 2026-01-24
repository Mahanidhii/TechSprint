import React from 'react';
import './DocumentList.css';

function DocumentList({ documents, onDocumentSelect, onDeleteDocument }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type) => {
    const icons = {
      legal: 'LAW',
      medical: 'MED',
      government: 'GOV',
      terms: 'T&C',
      privacy: 'PRIV',
      general: 'DOC'
    };
    return icons[type] || 'DOC';
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="document-list">
        <div className="card">
          <h2>My Documents</h2>
          <div className="empty-state">
            <p>No documents uploaded yet.</p>
            <p>Upload your first document to get started!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="document-list">
      <div className="card">
        <h2>My Documents</h2>
        <p className="subtitle">Click on a document to view or analyze</p>

        <div className="documents-grid">
          {documents.map((doc) => (
            <div key={doc._id} className="document-card">
              <div className="document-header">
                <span className="document-icon">{getTypeIcon(doc.type)}</span>
                <div className="document-info">
                  <h3>{doc.title}</h3>
                  <span className="document-type">{doc.type}</span>
                </div>
                <span className={`status-badge ${doc.analyzed ? 'analyzed' : 'pending'}`}>
                  {doc.analyzed ? 'Analyzed' : 'Pending'}
                </span>
              </div>

              <div className="document-meta">
                <span className="date">{formatDate(doc.uploaded_at)}</span>
              </div>

              <div className="document-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => onDocumentSelect(doc)}
                >
                  {doc.analyzed ? 'View Analysis' : 'Analyze Now'}
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this document?')) {
                      onDeleteDocument(doc._id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DocumentList;

import React, { useState } from 'react';
import './DocumentUpload.css';

function DocumentUpload({ apiUrl, token, onDocumentUploaded }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedFile, setSelectedFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a PDF file' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title || selectedFile.name);
      formData.append('type', type);

      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'PDF uploaded and processed successfully!' });
        setTitle('');
        setType('general');
        setSelectedFile(null);
        
        
        const fileInput = document.getElementById('pdf-file');
        if (fileInput) fileInput.value = '';
        
        setTimeout(() => {
          onDocumentUploaded(data.document_id);
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload document. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setMessage({ type: 'error', text: 'Please select a PDF file' });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace('.pdf', ''));
      }
      setMessage({ type: '', text: '' });
    }
  };

  return (
    <div className="document-upload">
      <div className="card">
        <h2>Upload PDF Document</h2>
        <p className="subtitle">Upload your legal, medical, or government PDF document for AI-powered analysis</p>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Document Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Employment Contract, Privacy Policy"
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Document Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="general">General</option>
              <option value="legal">Legal Document</option>
              <option value="medical">Medical Document</option>
              <option value="government">Government Document</option>
              <option value="terms">Terms & Conditions</option>
              <option value="privacy">Privacy Policy</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="pdf-file">Select PDF File *</label>
            <div className="file-upload-area">
              <input
                type="file"
                id="pdf-file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="file-input-pdf"
                required
              />
              <div className="upload-placeholder">
                {selectedFile ? (
                  <div className="file-selected">
                    <div className="file-icon">FILE</div>
                    <div className="file-info">
                      <strong>{selectedFile.name}</strong>
                      <span className="file-size">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      className="remove-file"
                      onClick={() => {
                        setSelectedFile(null);
                        const fileInput = document.getElementById('pdf-file');
                        if (fileInput) fileInput.value = '';
                      }}
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <div className="upload-icon">+</div>
                    <p><strong>Click to select a PDF file</strong></p>
                    <p className="upload-hint">or drag and drop here</p>
                  </div>
                )}
              </div>
            </div>
            <p className="help-text">
              Supported: Digital PDFs with extractable text (Max 10MB recommended)
            </p>
            <p className="help-text warning">
              Note: Scanned PDFs or image-only PDFs are not supported
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !selectedFile}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span> 
                Processing PDF & Analyzing...
              </>
            ) : (
              'Upload & Analyze Document'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default DocumentUpload;

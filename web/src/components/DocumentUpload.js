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
      setMessage({ type: 'error', text: 'Please select a document file' });
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
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'];
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
      
      const fileName = file.name.toLowerCase();
      const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!allowedTypes.includes(file.type) && !isValidExtension) {
        setMessage({ type: 'error', text: 'Please select a PDF or image file (JPG, PNG, GIF, BMP, TIFF, WEBP)' });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      if (!title) {
        const titleWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(titleWithoutExt);
      }
      setMessage({ type: '', text: '' });
    }
  };

  return (
    <div className="document-upload">
      <div className="card">
        <h2>Upload Document</h2>
        <p className="subtitle">Upload your legal, medical, or government document (PDF or Image) for AI-powered analysis</p>

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
            <label htmlFor="pdf-file">Select Document File *</label>
            <div className="file-upload-area">
              <input
                type="file"
                id="pdf-file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,image/*"
                onChange={handleFileSelect}
                className="file-input-pdf"
                required
              />
              <div className="upload-placeholder">
                {selectedFile ? (
                  <div className="file-selected">
                    <div className="file-icon">
                      {selectedFile.type.startsWith('image/') ? '🖼️' : '📄'}
                    </div>
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
                    <p><strong>Click to select a document file</strong></p>
                    <p className="upload-hint">PDF or Image (JPG, PNG, GIF, etc.)</p>
                  </div>
                )}
              </div>
            </div>
            <p className="help-text">
              Supported: PDFs (with extractable text) and Images (JPG, PNG, GIF, BMP, TIFF, WEBP)
            </p>
            <p className="help-text info">
              For images, OCR (text recognition) will be used to extract text
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
                Processing & Analyzing...
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

import React, { useState, useEffect } from 'react';
import './App.css';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import AnalysisView from './components/AnalysisView';
import Login from './components/Login';

function App() {
  const [view, setView] = useState('upload');
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      fetch(`${API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.user) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      })
      .catch(error => {
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
    }
  }, [API_URL]);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setView('upload');
    setDocuments([]);
    setSelectedDocument(null);
    setAnalysis(null);
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  useEffect(() => {
    if (view === 'list') {
      fetchDocuments();
    }
  }, [view]);

  const handleDocumentUploaded = (documentId) => {
    setView('list');
  };

  const handleDocumentSelect = async (document) => {
    setSelectedDocument(document);
    setLoading(true);
    setError(null);
    
    if (document.analyzed) {
      try {
        const response = await fetch(`${API_URL}/analysis/${document._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch analysis');
        }
        
        setAnalysis(data);
        setView('analysis');
      } catch (error) {
        console.error('Error fetching analysis:', error);
        setError('Failed to load analysis. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const response = await fetch(`${API_URL}/analyze/${document._id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to analyze document');
        }
        
        setAnalysis(data);
        setView('analysis');
        fetchDocuments(); // Refresh document list
      } catch (error) {
        console.error('Error analyzing document:', error);
        setError('Failed to analyze document. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedDocument(null);
    setAnalysis(null);
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await fetch(`${API_URL}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  if (!isAuthenticated) {
    return <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <div>
          <h1>BERO</h1>
          <p className="tagline">Simplifying Complex Documents with AI</p>
        </div>
        <div className="user-info">
          <span>Welcome, {user?.name || user?.email}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="App-nav">
        <button 
          className={view === 'upload' ? 'active' : ''} 
          onClick={() => setView('upload')}
        >
          Upload Document
        </button>
        <button 
          className={view === 'list' || view === 'analysis' ? 'active' : ''} 
          onClick={() => setView('list')}
        >
          My Documents
        </button>
      </nav>

      <main className="App-main">
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Analyzing document with AI...</p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        
        {!loading && !error && view === 'upload' && (
          <DocumentUpload 
            apiUrl={API_URL}
            token={token}
            onDocumentUploaded={handleDocumentUploaded} 
          />
        )}
        
        {!loading && !error && view === 'list' && (
          <DocumentList 
            documents={documents}
            onDocumentSelect={handleDocumentSelect}
            onDeleteDocument={handleDeleteDocument}
          />
        )}
        
        {!loading && !error && view === 'analysis' && analysis && (
          <AnalysisView 
            analysis={analysis}
            document={selectedDocument}
            onBack={handleBackToList}
          />
        )}
      </main>

      <footer className="App-footer">
        <p>This tool provides simplified explanations only. It does not constitute legal, medical, or financial advice.</p>
      </footer>
    </div>
  );
}

export default App;

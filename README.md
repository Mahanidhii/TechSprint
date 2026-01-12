# 📄 Document De-Jargonizer

An AI-powered web application that simplifies complex legal, medical, and government documents into plain, easy-to-understand language.

## 🌟 Features

- **PDF Document Upload**: Upload and process PDF documents only
- **AI-Powered Text Extraction**: Automatically extracts text from PDF files
- **Intelligent Analysis**: Uses Google Gemini AI to analyze and explain documents
- **Plain Language Summaries**: Get simplified explanations in Grade 8 level language
- **Key Terms Explained**: Understand complex terminology
- **Risk Detection**: Identify potential risks and concerns in documents
- **Important Clauses**: Highlights critical sections you need to know
- **Document Management**: Store and manage multiple documents
- **MongoDB Database**: Persistent storage for documents and analyses

## 🛠️ Tech Stack

### Backend
- **Python 3.8+**
- **Flask** - Web framework
- **MongoDB** - Database
- **Google Gemini AI** - AI analysis
- **PyPDF2** - PDF text extraction
- **pdfplumber** - Advanced PDF processing
- **Flask-CORS** - Cross-origin resource sharing

### Frontend
- **React 19** - UI framework
- **CSS3** - Styling
- **Fetch API** - HTTP requests

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Python 3.8 or higher
- Node.js 14 or higher
- MongoDB (running locally or cloud instance)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
cd /home/mithun-sanjith/Documents/workspace/Hackathon/bero
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Linux/Mac
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env file and add your credentials
# MONGO_URI=mongodb://localhost:27017/
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB (if not already installed)
# On Ubuntu/Debian:
sudo apt-get install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**Option B: MongoDB Atlas (Cloud)**
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get your connection string
4. Update `MONGO_URI` in backend/.env

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# The .env file is already created with default settings
# You can modify it if your backend runs on a different port
```

## 🎯 Running the Application

### Start Backend Server

```bash
# From backend directory
cd backend
source venv/bin/activate  # Activate virtual environment if using one
python main.py
```

The backend will run on `http://localhost:5000`

### Start Frontend Development Server

```bash
# From frontend directory (in a new terminal)
cd frontend
npm start
```

The frontend will run on `http://localhost:3000` and automatically open in your browser.

## 📖 Usage

1. **Upload a PDF Document**
   - Click "Upload Document"
   - Click on the upload area or drag and drop your PDF file
   - The system supports only PDF files with extractable text
   - Enter a title (auto-filled from filename)
   - Select document type (Legal, Medical, Government, etc.)
   - Click "🚀 Upload & Analyze Document"

2. **Processing**
   - The system extracts text from your PDF using advanced algorithms
   - Gemini AI analyzes the extracted content
   - Analysis is automatically generated and saved

3. **View Analysis**
   - Click "My Documents" to see all uploaded PDFs
   - Documents show their status (Analyzed or Pending)
   - Click on any document to view the AI-generated analysis

4. **Analysis Features**
   - **Plain Summary**: Easy-to-understand overview
   - **Key Terms**: Complex terms explained simply
   - **Important Clauses**: Critical sections highlighted
   - **Risks & Concerns**: Potential issues identified
   - **Unclear Items**: Missing or ambiguous information noted

5. **Delete Documents**
   - Click the "Delete" button on any document card
   - Confirm the deletion

## ⚠️ Important Notes

### Supported PDFs
- ✅ Digital PDFs with selectable/copyable text
- ✅ PDFs created from Word, Google Docs, or similar tools
- ✅ E-signed documents with text layers

### NOT Supported
- ❌ Scanned PDFs (image-only)
- ❌ Image-based PDFs without text layer
- ❌ Password-protected PDFs
- ❌ Corrupted or damaged PDFs

**Tip**: If you can select/copy text in your PDF viewer, it will work!

## 🔑 API Endpoints

### Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/upload` | Upload a PDF document (multipart/form-data) |
| GET | `/api/documents` | Get all documents |
| GET | `/api/documents/<id>` | Get specific document |
| POST | `/api/analyze/<id>` | Analyze a document with AI |
| GET | `/api/analysis/<id>` | Get analysis for a document |
| DELETE | `/api/documents/<id>` | Delete a document and its analysis |

### Upload PDF Endpoint

```bash
POST /api/upload
Content-Type: multipart/form-data

Form Data:
- file: PDF file (required)
- title: Document title (optional, defaults to filename)
- type: Document type (optional, defaults to 'general')
```

## 🎨 Document Types Supported

- General Documents
- Legal Documents
- Medical Documents
- Government Documents
- Terms & Conditions
- Privacy Policies

## ⚠️ Important Notes

### Critical Rules (Implemented in AI)
1. Uses ONLY the provided document text as source
2. Explicitly states unclear, missing, or ambiguous information
3. Does NOT give legal, medical, or financial advice
4. Does NOT guess intent or outcomes
5. Does NOT summarize away important details
6. Uses plain language (Grade 8 level)
7. Explains WHY clauses may be risky using document's wording

### Disclaimer
This tool provides simplified explanations only. It does not constitute legal, medical, or financial advice. Always consult qualified professionals for expert guidance.

## 🐛 Troubleshooting

### Backend Issues

**MongoDB Connection Error**
```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Or if using mongod directly
ps aux | grep mongod
```

**Missing Dependencies**
```bash
pip install -r requirements.txt
```

### Frontend Issues

**Port Already in Use**
```bash
# Kill process on port 3000
sudo lsof -ti:3000 | xargs kill -9
```

**Module Not Found**
```bash
npm install
```

## 📁 Project Structure

```
bero/
├── backend/
│   ├── main.py              # Flask backend application
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example        # Environment variables template
│   └── .env                # Your environment variables (create this)
│
├── frontend/
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── DocumentUpload.js
│   │   │   ├── DocumentList.js
│   │   │   └── AnalysisView.js
│   │   ├── App.js          # Main App component
│   │   ├── App.css         # Global styles
│   │   └── index.js        # Entry point
│   ├── package.json        # Node dependencies
│   └── .env                # Frontend environment variables
│
└── README.md               # This file
```

## 🔐 Security Considerations

- Never commit `.env` files to version control
- Keep your Gemini API key secure
- Use environment variables for sensitive data
- Implement rate limiting for production use
- Add authentication for production deployment

## 🚀 Future Enhancements

- [ ] User authentication and authorization
- [ ] Document comparison feature
- [ ] Export analysis as PDF
- [ ] Support for more document formats (PDF, DOCX)
- [ ] Multi-language support
- [ ] Document versioning
- [ ] Collaborative features

## 📝 License

This project is for educational and demonstration purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ for Hackathon**

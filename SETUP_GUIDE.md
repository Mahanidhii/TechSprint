# BERO - Complete Setup Guide

## Overview

BERO (Document De-Jargonizer) is a full-stack application that uses AI to analyze and simplify complex legal, medical, and government documents.

### Stack
- **Backend:** Python Flask with Google Gemini AI
- **Web Frontend:** React
- **Mobile:** React Native (Expo)
- **Database:** MongoDB
- **Translation:** Google Translate (deep-translator)
- **OCR:** Tesseract OCR

## Features

✅ **Multi-format Document Support**
- PDF documents
- Image files (JPG, PNG, GIF, BMP, TIFF, WEBP)
- OCR for text extraction from images

✅ **AI-Powered Analysis**
- Plain language summaries
- Key terms explanation
- Important clauses highlighting
- Risk identification
- Unclear items detection

✅ **Multi-language Support**
- 30+ languages supported
- Real-time translation
- Languages include: English, Spanish, French, German, Hindi, Tamil, Telugu, Malayalam, Chinese, Japanese, Korean, Arabic, and more

✅ **Authentication & Security**
- JWT-based authentication
- Bcrypt password hashing
- Secure token storage on mobile

✅ **Cross-Platform**
- Web application (React)
- Mobile app (iOS & Android via React Native)

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Install Tesseract OCR (for image processing)
# On Arch Linux:
sudo pacman -S tesseract tesseract-data-eng

# Configure environment variables
# Create .env file with:
# MONGO_URI=mongodb://localhost:27017/
# GEMINI_API_KEY=your_gemini_api_key
# SECRET_KEY=your_secret_key

# Run the server
python main.py
```

Backend will run on `http://localhost:5000`

### 2. Web Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Update API URL if needed in src/App.js
# const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

# Start the web app
npm start
```

Web app will run on `http://localhost:3000`

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Update API URL in src/config/api.js
# For physical devices, use your computer's local IP
# export const API_URL = 'http://192.168.1.XXX:5000/api';

# Start Expo
npm start

# Then:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app on physical device
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify token

### Documents
- `POST /api/upload` - Upload document (PDF or image)
- `GET /api/documents` - Get user's documents
- `POST /api/analyze/:id` - Analyze document
- `DELETE /api/delete/:id` - Delete document

### Translation
- `POST /api/translate` - Translate text
- `POST /api/translate-analysis` - Translate full analysis
- `GET /api/languages` - Get supported languages

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb://localhost:27017/
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_secret_key_here
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

### Mobile (src/config/api.js)
```javascript
export const API_URL = 'http://YOUR_IP:5000/api';
```

## Dependencies

### Backend
- flask - Web framework
- flask-cors - CORS support
- pymongo - MongoDB driver
- google-generativeai - Gemini AI
- PyPDF2 & pdfplumber - PDF processing
- pytesseract - OCR for images
- deep-translator - Translation
- bcrypt & pyjwt - Authentication

### Web Frontend
- react - UI framework
- axios - HTTP client
- react-router-dom - Routing (if needed)

### Mobile
- expo - React Native framework
- @react-navigation - Navigation
- axios - HTTP client
- expo-document-picker - Document picking
- expo-image-picker - Image picking
- expo-secure-store - Secure storage
- react-native-picker-select - Language selector

## Supported Languages

English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese (Simplified & Traditional), Arabic, Hindi, Bengali, Tamil, Telugu, Malayalam, Kannada, Marathi, Gujarati, Punjabi, Urdu, Dutch, Polish, Turkish, Vietnamese, Thai, Indonesian, Malay, Filipino, Swedish, Danish, Norwegian, Finnish

## Troubleshooting

### Backend Issues
- Ensure MongoDB is running
- Check Gemini API key is valid
- Install Tesseract OCR for image processing
- Check Python version (3.8+)

### Frontend Issues
- Clear browser cache
- Check API URL configuration
- Ensure backend is running

### Mobile Issues
- Use local IP for physical devices
- Android emulator: use `10.0.2.2:5000`
- iOS simulator: use `localhost:5000`
- Ensure devices are on same network
- Clear Metro bundler cache: `expo start -c`

## Production Deployment

### Backend
- Use production MongoDB instance
- Set up proper environment variables
- Use Gunicorn or uWSGI
- Configure HTTPS

### Web Frontend
- Build: `npm run build`
- Deploy to Netlify, Vercel, or AWS S3

### Mobile
- Build APK: `expo build:android`
- Build IPA: `expo build:ios`
- Submit to Google Play / App Store

## License

This project is licensed under the MIT License.

## Support

For issues, please create an issue in the repository or contact the development team.

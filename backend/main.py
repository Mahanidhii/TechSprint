from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, storage
import os
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv
import PyPDF2
import pdfplumber
import io
import base64
import bcrypt
import jwt
from functools import wraps
from deep_translator import GoogleTranslator
from PIL import Image
import pytesseract
import uuid

load_dotenv()

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this-in-production')

service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', './serviceAccountKey.json')
storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET')

if not firebase_admin._apps:
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': storage_bucket
    })

db = firestore.client()

users_collection = db.collection('users')
documents_collection = db.collection('documents')
analyses_collection = db.collection('analyses')

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-2.5-flash')

def extract_text_from_image(image_file):
    """Extract text from image using OCR (pytesseract)"""
    try:
        image_file.seek(0)
        image = Image.open(image_file)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        text = pytesseract.image_to_string(image)
        
        return text.strip()
    
    except Exception as e:
        raise Exception(f"Error extracting text from image: {str(e)}")

def extract_text_from_pdf(pdf_file):
    text = ""
    
    try:
        pdf_file.seek(0)
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
        
        if len(text.strip()) < 100:
            pdf_file.seek(0)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
        
        return text.strip()
    
    except Exception as e:
        raise Exception(f"Error extracting text from PDF: {str(e)}")

DEJARGONIZER_PROMPT = """You are a Document De-Jargonizer AI.

Your role is to explain complex legal, medical, or government documents
in clear, simple language WITHOUT adding information that is not present
in the document.

CRITICAL RULES:
1. You must ONLY use the provided document text as your source.
2. If something is unclear, missing, or ambiguous, say so explicitly.
3. Do NOT give legal, medical, or financial advice.
4. Do NOT guess intent or outcomes.
5. Do NOT summarize away important details.
6. Use plain language suitable for a non-expert reader (Grade 8 level).
7. If a clause is risky, explain WHY it may be risky using the document's wording.

Analyze the following document and provide:
1. A plain language summary
2. Key terms explained
3. Important clauses highlighted
4. Potential risks or concerns (based only on the document text)
5. Any unclear or missing information

Document:
{document_text}

Provide your analysis in the following JSON structure:
{{
  "plain_summary": "Your summary here",
  "key_terms": [
    {{"term": "term1", "explanation": "plain language explanation"}},
    {{"term": "term2", "explanation": "plain language explanation"}}
  ],
  "important_clauses": [
    {{"clause": "clause text", "explanation": "why this matters", "section": "section reference"}}
  ],
  "risks_and_concerns": [
    {{"risk": "what the risk is", "explanation": "why this may be risky based on document wording"}}
  ],
  "unclear_items": [
    "Item 1 that is unclear or missing",
    "Item 2 that is unclear or missing"
  ]
}}
"""

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_doc = users_collection.document(data['user_id']).get()
            
            if not user_doc.exists:
                return jsonify({'error': 'User not found'}), 401
            
            current_user = user_doc.to_dict()
            current_user['id'] = user_doc.id
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()})

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        name = data.get('name', '').strip()
        
        if '@' not in email or '.' not in email:
            return jsonify({'error': 'Invalid email format'}), 400
        
        existing_users = users_collection.where('email', '==', email).limit(1).stream()
        if any(existing_users):
            return jsonify({'error': 'User with this email already exists'}), 409
        
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user = {
            'email': email,
            'password': hashed_password,
            'name': name,
            'created_at': firestore.SERVER_TIMESTAMP,
            'last_login': None
        }
        
        doc_ref = users_collection.document()
        doc_ref.set(user)
        user_id = doc_ref.id
        
        token = jwt.encode({
            'user_id': user_id,
            'email': email,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': user_id,
                'email': email,
                'name': name
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        
        users = users_collection.where('email', '==', email).limit(1).stream()
        user_doc = None
        user_id = None
        
        for doc in users:
            user_doc = doc.to_dict()
            user_id = doc.id
            break
        
        if not user_doc:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not bcrypt.checkpw(password.encode('utf-8'), user_doc['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        users_collection.document(user_id).update({
            'last_login': firestore.SERVER_TIMESTAMP
        })
        
        token = jwt.encode({
            'user_id': user_id,
            'email': email,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user_id,
                'email': user_doc['email'],
                'name': user_doc.get('name', '')
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token(current_user):
    return jsonify({
        'valid': True,
        'user': {
            'id': current_user['id'],
            'email': current_user['email'],
            'name': current_user.get('name', '')
        }
    }), 200

@app.route('/api/upload', methods=['POST'])
@token_required
def upload_document(current_user):
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided. Please upload a PDF or image document."}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        filename_lower = file.filename.lower()
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']
        
        if not any(filename_lower.endswith(ext) for ext in allowed_extensions):
            return jsonify({"error": "Unsupported file format. Please upload a PDF or image file (JPG, PNG, GIF, BMP, TIFF, WEBP)."}), 400
        
        try:
            if filename_lower.endswith('.pdf'):
                extracted_text = extract_text_from_pdf(file)
                source_type = "pdf"
            else:
                extracted_text = extract_text_from_image(file)
                source_type = "image"
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                if source_type == "pdf":
                    return jsonify({
                        "error": "Could not extract text from PDF. The PDF might be scanned, image-only, or empty. Please ensure your PDF has selectable text."
                    }), 400
                else:
                    return jsonify({
                        "error": "Could not extract text from image. The image might be unclear or empty. Please ensure the image contains readable text."
                    }), 400
            
        except Exception as e:
            return jsonify({"error": f"Failed to process file: {str(e)}"}), 400
        
        title = request.form.get('title', file.filename)
        doc_type = request.form.get('type', 'general')
        
        print(f"Creating document: title={title}, type={doc_type}, user_id={current_user['id']}")
        
        document = {
            "text": extracted_text,
            "title": title,
            "type": doc_type,
            "uploaded_at": firestore.SERVER_TIMESTAMP,
            "analyzed": False,
            "source": source_type,
            "filename": file.filename,
            "user_id": current_user['id']
        }
        
        doc_ref = documents_collection.document()
        doc_ref.set(document)
        
        print(f"Document created successfully with ID: {doc_ref.id}")
        
        return jsonify({
            "message": "Document uploaded successfully",
            "document_id": doc_ref.id
        }), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyze/<document_id>', methods=['POST'])
@token_required
def analyze_document(current_user, document_id):
    try:
        doc_ref = documents_collection.document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({"error": "Document not found"}), 404
        
        document = doc.to_dict()
        
        if document['user_id'] != current_user['id']:
            return jsonify({"error": "Document not found"}), 404
        
        existing_analysis_doc = analyses_collection.document(document_id).get()
        if existing_analysis_doc.exists:
            existing_analysis = existing_analysis_doc.to_dict()
            existing_analysis['id'] = existing_analysis_doc.id
            if 'analyzed_at' in existing_analysis and hasattr(existing_analysis['analyzed_at'], 'isoformat'):
                existing_analysis['analyzed_at'] = existing_analysis['analyzed_at'].isoformat()
            return jsonify(existing_analysis), 200
        
        prompt = DEJARGONIZER_PROMPT.format(document_text=document['text'])
        
        response = model.generate_content(prompt)
        analysis_text = response.text
        
        import json
        import re
        
        json_match = re.search(r'```json\s*(.*?)\s*```', analysis_text, re.DOTALL)
        if json_match:
            analysis_text = json_match.group(1)
        
        try:
            analysis_data = json.loads(analysis_text)
        except json.JSONDecodeError:
            analysis_data = {
                "plain_summary": analysis_text,
                "key_terms": [],
                "important_clauses": [],
                "risks_and_concerns": [],
                "unclear_items": []
            }
        
        analysis = {
            "document_id": document_id,
            "title": document.get('title', 'Untitled Document'),
            "analyzed_at": firestore.SERVER_TIMESTAMP,
            "plain_summary": analysis_data.get('plain_summary', ''),
            "key_terms": analysis_data.get('key_terms', []),
            "important_clauses": analysis_data.get('important_clauses', []),
            "risks_and_concerns": analysis_data.get('risks_and_concerns', []),
            "unclear_items": analysis_data.get('unclear_items', [])
        }
        
        analyses_collection.document(document_id).set(analysis)
        
        doc_ref.update({
            "analyzed": True,
            "analyzed_at": firestore.SERVER_TIMESTAMP
        })
        
        analysis['id'] = document_id
        analysis['analyzed_at'] = datetime.utcnow().isoformat()
        
        return jsonify(analysis), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/documents', methods=['GET'])
@token_required
def get_documents(current_user):
    try:
        print(f"Fetching documents for user: {current_user['id']}")
        
        try:
            docs_query = documents_collection.where('user_id', '==', current_user['id']).order_by('uploaded_at', direction=firestore.Query.DESCENDING).stream()
            documents = []
            for doc in docs_query:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                doc_data['_id'] = doc.id
                
                if 'uploaded_at' in doc_data and hasattr(doc_data['uploaded_at'], 'isoformat'):
                    doc_data['uploaded_at'] = doc_data['uploaded_at'].isoformat()
                if 'analyzed_at' in doc_data and hasattr(doc_data['analyzed_at'], 'isoformat'):
                    doc_data['analyzed_at'] = doc_data['analyzed_at'].isoformat()
                
                documents.append(doc_data)
                
        except Exception as order_error:
            print(f"Order by failed (index not ready), fetching without ordering: {order_error}")
            docs_query = documents_collection.where('user_id', '==', current_user['id']).stream()
            documents = []
            for doc in docs_query:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                doc_data['_id'] = doc.id
                
                if 'uploaded_at' in doc_data and hasattr(doc_data['uploaded_at'], 'isoformat'):
                    doc_data['uploaded_at'] = doc_data['uploaded_at'].isoformat()
                elif 'uploaded_at' in doc_data and doc_data['uploaded_at'] is None:
                    doc_data['uploaded_at'] = datetime.utcnow().isoformat()
                    
                if 'analyzed_at' in doc_data and hasattr(doc_data['analyzed_at'], 'isoformat'):
                    doc_data['analyzed_at'] = doc_data['analyzed_at'].isoformat()
                
                documents.append(doc_data)
            
            documents.sort(key=lambda x: x.get('uploaded_at', ''), reverse=True)
        
        print(f"Found {len(documents)} documents")
        return jsonify({"documents": documents}), 200
    
    except Exception as e:
        print(f"Error fetching documents: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/documents/<document_id>', methods=['GET'])
@token_required
def get_document(current_user, document_id):
    try:
        doc_ref = documents_collection.document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({"error": "Document not found"}), 404
        
        document = doc.to_dict()
        
        if document['user_id'] != current_user['id']:
            return jsonify({"error": "Document not found"}), 404
        
        document['id'] = doc.id
        document['_id'] = doc.id
        
        if 'uploaded_at' in document and hasattr(document['uploaded_at'], 'isoformat'):
            document['uploaded_at'] = document['uploaded_at'].isoformat()
        if 'analyzed_at' in document and hasattr(document['analyzed_at'], 'isoformat'):
            document['analyzed_at'] = document['analyzed_at'].isoformat()
        
        return jsonify(document), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/<document_id>', methods=['GET'])
@token_required
def get_analysis(current_user, document_id):
    try:
        doc_ref = documents_collection.document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({"error": "Document not found"}), 404
        
        document = doc.to_dict()
        if document['user_id'] != current_user['id']:
            return jsonify({"error": "Document not found"}), 404
        
        analysis_doc = analyses_collection.document(document_id).get()
        
        if not analysis_doc.exists:
            return jsonify({"error": "Analysis not found"}), 404
        
        analysis = analysis_doc.to_dict()
        analysis['id'] = analysis_doc.id
        analysis['_id'] = analysis_doc.id
        
        if 'analyzed_at' in analysis and hasattr(analysis['analyzed_at'], 'isoformat'):
            analysis['analyzed_at'] = analysis['analyzed_at'].isoformat()
        
        return jsonify(analysis), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/documents/<document_id>', methods=['DELETE'])
@token_required
def delete_document(current_user, document_id):
    try:
        doc_ref = documents_collection.document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({"error": "Document not found"}), 404
        
        document = doc.to_dict()
        if document['user_id'] != current_user['id']:
            return jsonify({"error": "Document not found"}), 404
        
        doc_ref.delete()
        
        analyses_collection.document(document_id).delete()
        
        return jsonify({"message": "Document deleted successfully"}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translate', methods=['POST'])
@token_required
def translate_text(current_user):
    try:
        data = request.get_json()
        text = data.get('text')
        target_lang = data.get('target_lang', 'en')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        translator = GoogleTranslator(source='auto', target=target_lang)
        translated_text = translator.translate(text)
        
        return jsonify({
            'translated_text': translated_text,
            'target_lang': target_lang
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Translation failed: {str(e)}'}), 500

@app.route('/api/translate-analysis', methods=['POST'])
@token_required
def translate_analysis(current_user):
    try:
        print("=== Translation Request Received ===")
        data = request.get_json()
        print(f"Request data keys: {data.keys() if data else 'None'}")
        
        analysis = data.get('analysis')
        target_lang = data.get('target_lang', 'en')
        
        print(f"Target language: {target_lang}")
        print(f"Analysis keys: {analysis.keys() if analysis else 'None'}")
        
        if not analysis:
            print("ERROR: No analysis data provided")
            return jsonify({'error': 'Analysis data is required'}), 400
        
        print("Initializing translator...")
        translator = GoogleTranslator(source='auto', target=target_lang)
        
        translated_analysis = {}
        
        if analysis.get('plain_summary'):
            print("Translating plain_summary...")
            translated_analysis['plain_summary'] = translator.translate(
                analysis['plain_summary']
            )
        
        if analysis.get('key_terms'):
            translated_analysis['key_terms'] = []
            for term in analysis['key_terms']:
                translated_term = {
                    'term': translator.translate(term.get('term', '')),
                    'explanation': translator.translate(term.get('explanation', ''))
                }
                translated_analysis['key_terms'].append(translated_term)
        
        if analysis.get('important_clauses'):
            translated_analysis['important_clauses'] = []
            for clause in analysis['important_clauses']:
                translated_clause = {
                    'clause': translator.translate(clause.get('clause', '')),
                    'explanation': translator.translate(clause.get('explanation', '')),
                    'section': translator.translate(clause.get('section', '')) if clause.get('section') else ''
                }
                translated_analysis['important_clauses'].append(translated_clause)
        
        if analysis.get('risks_and_concerns'):
            translated_analysis['risks_and_concerns'] = []
            for risk in analysis['risks_and_concerns']:
                translated_risk = {
                    'risk': translator.translate(risk.get('risk', '')),
                    'explanation': translator.translate(risk.get('explanation', ''))
                }
                translated_analysis['risks_and_concerns'].append(translated_risk)
        
        if analysis.get('unclear_items'):
            translated_analysis['unclear_items'] = []
            for item in analysis['unclear_items']:
                translated_analysis['unclear_items'].append(
                    translator.translate(item)
                )
        
        translated_analysis['title'] = analysis.get('title', '')
        translated_analysis['analyzed_at'] = analysis.get('analyzed_at', '')
        translated_analysis['document_id'] = analysis.get('document_id', '')
        
        print("Translation completed successfully")
        return jsonify({
            'translated_analysis': translated_analysis,
            'target_lang': target_lang
        }), 200
    
    except Exception as e:
        print(f"Translation ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Translation failed: {str(e)}'}), 500

@app.route('/api/languages', methods=['GET'])
def get_supported_languages():
    languages = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh-cn': 'Chinese (Simplified)',
        'zh-tw': 'Chinese (Traditional)',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'bn': 'Bengali',
        'ta': 'Tamil',
        'te': 'Telugu',
        'ml': 'Malayalam',
        'kn': 'Kannada',
        'mr': 'Marathi',
        'gu': 'Gujarati',
        'pa': 'Punjabi',
        'ur': 'Urdu',
        'nl': 'Dutch',
        'pl': 'Polish',
        'tr': 'Turkish',
        'vi': 'Vietnamese',
        'th': 'Thai',
        'id': 'Indonesian',
        'ms': 'Malay',
        'fil': 'Filipino',
        'sv': 'Swedish',
        'da': 'Danish',
        'no': 'Norwegian',
        'fi': 'Finnish'
    }
    return jsonify({'languages': languages}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
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

load_dotenv()

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this-in-production')

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client['document_dejargonizer']
documents_collection = db['documents']
analyses_collection = db['analyses']
users_collection = db['users']

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-2.5-flash')

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
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
                
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
        
        if users_collection.find_one({'email': email}):
            return jsonify({'error': 'User with this email already exists'}), 409
        
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user = {
            'email': email,
            'password': hashed_password,
            'name': name,
            'created_at': datetime.utcnow(),
            'last_login': None
        }
        
        result = users_collection.insert_one(user)
        
        token = jwt.encode({
            'user_id': str(result.inserted_id),
            'email': email,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': str(result.inserted_id),
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
        
        user = users_collection.find_one({'email': email})
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        users_collection.update_one(
            {'_id': user['_id']},
            {'$set': {'last_login': datetime.utcnow()}}
        )
        
        token = jwt.encode({
            'user_id': str(user['_id']),
            'email': email,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user.get('name', '')
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
            'id': str(current_user['_id']),
            'email': current_user['email'],
            'name': current_user.get('name', '')
        }
    }), 200

@app.route('/api/upload', methods=['POST'])
@token_required
def upload_document(current_user):
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No PDF file provided. Please upload a PDF document."}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Only PDF files are supported. Please upload a PDF document."}), 400
        
        try:
            extracted_text = extract_text_from_pdf(file)
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                return jsonify({
                    "error": "Could not extract text from PDF. The PDF might be scanned, image-only, or empty. Please ensure your PDF has selectable text."
                }), 400
            
        except Exception as e:
            return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 400
        
        title = request.form.get('title', file.filename)
        doc_type = request.form.get('type', 'general')
        
        document = {
            "text": extracted_text,
            "title": title,
            "type": doc_type,
            "uploaded_at": datetime.utcnow(),
            "analyzed": False,
            "source": "pdf",
            "filename": file.filename,
            "user_id": str(current_user['_id'])
        }
        
        result = documents_collection.insert_one(document)
        
        return jsonify({
            "message": "Document uploaded successfully",
            "document_id": str(result.inserted_id)
        }), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyze/<document_id>', methods=['POST'])
@token_required
def analyze_document(current_user, document_id):
    try:
        document = documents_collection.find_one({
            "_id": ObjectId(document_id),
            "user_id": str(current_user['_id'])
        })
        
        if not document:
            return jsonify({"error": "Document not found"}), 404
        
        existing_analysis = analyses_collection.find_one({"document_id": document_id})
        if existing_analysis:
            existing_analysis['_id'] = str(existing_analysis['_id'])
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
            "analyzed_at": datetime.utcnow(),
            "plain_summary": analysis_data.get('plain_summary', ''),
            "key_terms": analysis_data.get('key_terms', []),
            "important_clauses": analysis_data.get('important_clauses', []),
            "risks_and_concerns": analysis_data.get('risks_and_concerns', []),
            "unclear_items": analysis_data.get('unclear_items', [])
        }
        
        result = analyses_collection.insert_one(analysis)
        
        documents_collection.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {"analyzed": True, "analyzed_at": datetime.utcnow()}}
        )
        
        analysis['_id'] = str(result.inserted_id)
        
        return jsonify(analysis), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/documents', methods=['GET'])
@token_required
def get_documents(current_user):
    try:
        documents = list(documents_collection.find({
            "user_id": str(current_user['_id'])
        }).sort("uploaded_at", -1))
        
        for doc in documents:
            doc['_id'] = str(doc['_id'])
            doc['uploaded_at'] = doc['uploaded_at'].isoformat()
            if 'analyzed_at' in doc:
                doc['analyzed_at'] = doc['analyzed_at'].isoformat()
        
        return jsonify(documents), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/documents/<document_id>', methods=['GET'])
@token_required
def get_document(current_user, document_id):
    try:
        document = documents_collection.find_one({
            "_id": ObjectId(document_id),
            "user_id": str(current_user['_id'])
        })
        
        if not document:
            return jsonify({"error": "Document not found"}), 404
        
        document['_id'] = str(document['_id'])
        document['uploaded_at'] = document['uploaded_at'].isoformat()
        if 'analyzed_at' in document:
            document['analyzed_at'] = document['analyzed_at'].isoformat()
        
        return jsonify(document), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/<document_id>', methods=['GET'])
@token_required
def get_analysis(current_user, document_id):
    try:
        document = documents_collection.find_one({
            "_id": ObjectId(document_id),
            "user_id": str(current_user['_id'])
        })
        
        if not document:
            return jsonify({"error": "Document not found"}), 404
        
        analysis = analyses_collection.find_one({"document_id": document_id})
        
        if not analysis:
            return jsonify({"error": "Analysis not found"}), 404
        
        analysis['_id'] = str(analysis['_id'])
        analysis['analyzed_at'] = analysis['analyzed_at'].isoformat()
        
        return jsonify(analysis), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/documents/<document_id>', methods=['DELETE'])
@token_required
def delete_document(current_user, document_id):
    try:
        result = documents_collection.delete_one({
            "_id": ObjectId(document_id),
            "user_id": str(current_user['_id'])
        })
        
        if result.deleted_count == 0:
            return jsonify({"error": "Document not found"}), 404
        
        analyses_collection.delete_one({"document_id": document_id})
        
        return jsonify({"message": "Document deleted successfully"}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/apiService';

export default function UploadScreen({ navigation, onDocumentUploaded }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('general');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permission');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        setSelectedFile({
          uri: image.uri,
          name: `image_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          size: image.fileSize,
        });
        if (!title) {
          setTitle(`Image_${Date.now()}`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permission');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        setSelectedFile({
          uri: image.uri,
          name: `photo_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          size: image.fileSize,
        });
        if (!title) {
          setTitle(`Photo_${Date.now()}`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a document file');
      return;
    }

    setLoading(true);
    try {
      const data = await apiService.uploadDocument(
        selectedFile,
        title || selectedFile.name,
        type
      );
      Alert.alert('Success', 'Document uploaded successfully!');
      setTitle('');
      setType('general');
      setSelectedFile(null);
      
      if (onDocumentUploaded) {
        onDocumentUploaded(data.document_id);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to upload document'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload Document</Text>
        <Text style={styles.subtitle}>
          Upload your legal, medical, or government document (PDF or Image) for
          AI-powered analysis
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Document Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Employment Contract, Privacy Policy"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Document Type</Text>
          <View style={styles.typeButtons}>
            {[
              { value: 'general', label: 'General' },
              { value: 'legal', label: 'Legal' },
              { value: 'medical', label: 'Medical' },
              { value: 'government', label: 'Government' },
              { value: 'terms', label: 'Terms & Conditions' },
              { value: 'privacy', label: 'Privacy Policy' },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.typeButton,
                  type === item.value && styles.typeButtonActive,
                ]}
                onPress={() => setType(item.value)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === item.value && styles.typeButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Document File</Text>
          
          <View style={styles.pickerButtons}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={pickDocument}
            >
              <Text style={styles.pickerButtonText}>📄 Pick PDF</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={pickImage}
            >
              <Text style={styles.pickerButtonText}>🖼️ Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerButton, styles.cameraButton]}
              onPress={takePhoto}
            >
              <Text style={styles.pickerButtonText}>📷 Camera</Text>
            </TouchableOpacity>
          </View>

          {selectedFile && (
            <View style={styles.fileInfo}>
              <Text style={styles.fileInfoText}>
                Selected: {selectedFile.name}
              </Text>
              <Text style={styles.fileSize}>
                {((selectedFile.size || 0) / 1024).toFixed(2)} KB
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setSelectedFile(null)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.helpText}>
            📄 Pick PDF files or 📷 Take/Upload photos of documents
          </Text>
          <Text style={styles.helpTextInfo}>
            Text is automatically extracted using OCR technology
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || !selectedFile) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !selectedFile}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Upload & Analyze Document</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#00838d',
    borderColor: '#00838d',
  },
  typeButtonText: {
    color: '#666',
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  pickerButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#00838d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cameraButton: {
    backgroundColor: '#0097a7',
  },
  pickerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  fileInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  fileInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  removeButton: {
    backgroundColor: '#ff4444',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  helpTextInfo: {
    fontSize: 12,
    color: '#00838d',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#00838d',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

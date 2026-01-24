import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import UploadScreen from './src/screens/UploadScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import { authService } from './src/services/authService';
import { apiService } from './src/services/apiService';

const Stack = createStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await authService.getToken();
      const userData = await authService.getUser();

      if (token && userData) {
        const verifyData = await apiService.verifyToken();
        if (verifyData.user) {
          setUser(verifyData.user);
          setIsAuthenticated(true);
        } else {
          await authService.clearAuth();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await authService.clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await authService.clearAuth();
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00838d" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#00838d',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Main"
            options={({ navigation }) => ({
              title: 'BERO - Document De-Jargonizer',
              headerRight: () => (
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              ),
            })}
          >
            {(props) => <MainTabs {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen
            name="Analysis"
            component={AnalysisScreen}
            options={{
              title: 'Document Analysis',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

function MainTabs({ navigation, user }) {
  const [activeTab, setActiveTab] = useState('upload');

  const handleDocumentUploaded = (documentId) => {
    setActiveTab('documents');
  };

  const handleDocumentSelect = async (document) => {
    navigation.navigate('Analysis', { document });
  };

  return (
    <View style={styles.container}>
      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'upload' && (
          <UploadScreen
            navigation={navigation}
            onDocumentUploaded={handleDocumentUploaded}
          />
        )}
        {activeTab === 'documents' && (
          <DocumentsScreen
            navigation={navigation}
            onDocumentSelect={handleDocumentSelect}
          />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upload' && styles.activeTab]}
          onPress={() => setActiveTab('upload')}
        >
          <Text style={styles.tabIcon}>📤</Text>
          <Text
            style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}
          >
            Upload
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
          onPress={() => setActiveTab('documents')}
        >
          <Text style={styles.tabIcon}>📄</Text>
          <Text
            style={[
              styles.tabText,
              activeTab === 'documents' && styles.activeTabText,
            ]}
          >
            Documents
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderTopWidth: 3,
    borderTopColor: '#00838d',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
  },
  activeTabText: {
    color: '#00838d',
    fontWeight: '600',
  },
  logoutButton: {
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});


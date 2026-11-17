import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const SESSION_KEY = '@techChallenge:session';

const expoHost = Constants.expoConfig?.hostUri;
const expoHostName = expoHost?.startsWith('[')
  ? expoHost.slice(1, expoHost.indexOf(']'))
  : expoHost?.split(':')[0];
const host = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.hostname
  : expoHostName;

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || `http://${host || 'localhost'}:3003`,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const rawSession = await AsyncStorage.getItem(SESSION_KEY);
  if (rawSession) {
    const session = JSON.parse(rawSession);
    if (session?.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
  }
  return config;
});

export default api;

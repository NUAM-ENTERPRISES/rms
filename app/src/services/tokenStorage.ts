import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, TokenData } from '@/features/auth/authTypes';

const ACCESS_TOKEN_KEY = '@affiniks_access_token';
const REFRESH_TOKEN_KEY = '@affiniks_refresh_token';
const USER_DATA_KEY = '@affiniks_user_data';
class TokenStorageService {
  // Store tokens using AsyncStorage
  async setTokens(accessToken: string, refreshToken: string, userData: User): Promise<void> {
    try {
      // Store each token separately
      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
      ]);
      console.log('✅ Tokens stored successfully in AsyncStorage');
    } catch (error) {
      console.error('❌ Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  // Retrieve access token
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving access token:', error);
      return null;
    }
  }

  // Retrieve refresh token
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  // Retrieve user data
  async getUserData(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  }

  // Get all stored data
  async getAllTokenData(): Promise<TokenData | null> {
    try {
      const [accessToken, refreshToken, userData] = await Promise.all([
        this.getAccessToken(),
        this.getRefreshToken(),
        this.getUserData(),
      ]);

      if (accessToken && refreshToken && userData) {
        return { accessToken, refreshToken, userData };
      }
      return null;
    } catch (error) {
      console.error('Error retrieving all token data:', error);
      return null;
    }
  }

  // Update only access token (for refresh scenarios)
  async updateAccessToken(accessToken: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      console.log('✅ Access token updated successfully');
    } catch (error) {
      console.error('❌ Error updating access token:', error);
      throw new Error('Failed to update access token');
    }
  }

  // Clear all stored tokens
  async clearTokens(): Promise<void> {
    try {
      // Remove all tokens from AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY).catch(() => {}),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY).catch(() => {}),
        AsyncStorage.removeItem(USER_DATA_KEY).catch(() => {}),
      ]);
      console.log('✅ All tokens cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
      // Don't throw here, as we want to clear Redux state even if storage fails
    }
  }

  // Check if tokens exist
  async hasTokens(): Promise<boolean> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      ]);
      return !!(accessToken && refreshToken);
    } catch (error) {
      console.error('Error checking for tokens:', error);
      return false;
    }
  }
}

export const tokenStorage = new TokenStorageService();
export type { User, TokenData };
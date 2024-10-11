import { OAuthProvider } from '../core/types';

export const GoogleProvider: OAuthProvider = {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
};
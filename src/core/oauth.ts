import axios from 'axios';
import { OAuthConfig, OAuthProvider, ResponseType } from './types';
import { generateState } from '../utils/crypto';

export class OAuth {
    private config: OAuthConfig;
    private provider: OAuthProvider;

    constructor(config: OAuthConfig, provider: OAuthProvider) {
        this.config = config;
        this.provider = provider;
    }

    async getAuthorizationUrl(): Promise<string> {
        const state = generateState();
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: 'code',
            scope: this.config.scope.join(' '),
            state,
        });

        return `${this.provider.authorizationUrl}?${params.toString()}`;
    }

    async getAccessToken(code: string): Promise<any> {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.config.redirectUri,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
        });

        const response = await axios.post(this.provider.tokenUrl, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        return response.data;
    }

    async handleCallback(code: string, responseType: ResponseType, targetDomain?: string): Promise<any> {
        const tokenData = await this.getAccessToken(code);

        switch (responseType) {
            case ResponseType.JSON:
                return this.handleJsonResponse(tokenData);
            case ResponseType.Cookie:
                return this.handleCookieResponse(tokenData);
            case ResponseType.CrossDomain:
                if (!targetDomain) throw new Error('Target domain is required for cross-domain response');
                return this.handleCrossDomainResponse(tokenData, targetDomain);
            default:
                throw new Error('Invalid response type');
        }
    }

    private handleJsonResponse(tokenData: any): any {
        return tokenData;
    }

    private handleCookieResponse(tokenData: any): string {
        // This should be implemented on the server-side
        return `access_token=${tokenData.access_token}; HttpOnly; Secure; SameSite=Strict`;
    }

    private async handleCrossDomainResponse(tokenData: any, targetDomain: string): Promise<void> {
        // In a real implementation, you'd use a secure method to send data cross-domain
        // This is a simplified example and should not be used in production
        await axios.post(`${targetDomain}/receive-token`, tokenData);
    }
}
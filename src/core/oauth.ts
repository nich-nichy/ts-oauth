import axios from 'axios';
import { OAuthConfig, OAuthProvider, ResponseType } from './types';
import { generateState } from '../utils/crypto';

interface DomainConfig {
    protocol?: 'http' | 'https';
    endpoint?: string;
    headers?: Record<string, string>;
}

export class OAuth {
    private config: OAuthConfig;
    private provider: OAuthProvider;
    private defaultDomain: string;

    constructor(config: OAuthConfig, provider: OAuthProvider) {
        this.config = config;
        this.provider = provider;
        this.defaultDomain = new URL(this.config.redirectUri).origin;
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

    async handleCallback(
        code: string,
        responseType: ResponseType,
        targetDomain?: string | DomainConfig
    ): Promise<any> {
        const tokenData = await this.getAccessToken(code);

        try {
            switch (responseType) {
                case ResponseType.JSON:
                    return this.handleJsonResponse(tokenData);
                case ResponseType.Cookie:
                    return this.handleCookieResponse(tokenData);
                case ResponseType.CrossDomain:
                    if (!targetDomain) {
                        throw new Error('Target domain is required for cross-domain response');
                    }
                    return this.handleCrossDomainResponse(tokenData, targetDomain);
                default:
                    throw new Error('Invalid response type');
            }
        } catch (error) {
            console.error('Callback handling error:', error);
            throw new Error(`Failed to handle callback: ${error || error.message}`);
        }
    }

    private handleJsonResponse(tokenData: any): any {
        return tokenData;
    }

    private handleCookieResponse(tokenData: any): string {
        return `access_token=${tokenData.access_token}; HttpOnly; Secure; SameSite=Strict`;
    }

    private async handleCrossDomainResponse(
        tokenData: any,
        targetDomain: string | DomainConfig
    ): Promise<any> {
        const domainConfig = this.normalizeDomainConfig(targetDomain);
        const endpoint = this.buildEndpointUrl(domainConfig);
        try {
            const payload = {
                ...tokenData,
                timestamp: new Date().toISOString(),
                source: this.defaultDomain
            };
            return await this.sendWithRetry(endpoint, payload, domainConfig.headers);
        } catch (error) {
            console.error('Cross-domain response error:', error);
            throw new Error(`Failed to send token to ${endpoint}: ${error || error.message}`);
        }
    }

    private normalizeDomainConfig(domain: string | DomainConfig): Required<DomainConfig> {
        if (typeof domain === 'string') {
            const parsedDomain = this.parseDomain(domain);
            return {
                protocol: parsedDomain.protocol,
                endpoint: '/receive-token',
                headers: {}
            };
        }

        return {
            protocol: domain.protocol || 'https',
            endpoint: domain.endpoint || '/receive-token',
            headers: domain.headers || {},
        };
    }
    private parseDomain(domain: string): { protocol: 'http' | 'https' } {
        const cleanDomain = domain.replace(/^(https?:\/\/)/, '');
        const isLocalhost = cleanDomain.includes('localhost') ||
            cleanDomain.match(/^(\d{1,3}\.){3}\d{1,3}$/);
        return {
            protocol: isLocalhost ? 'http' : 'https'
        };
    }

    private buildEndpointUrl(config: Required<DomainConfig>): string {
        const baseUrl = `${config.protocol}://${config.endpoint}`;
        return new URL(config.endpoint, baseUrl).toString();
    }

    private async sendWithRetry(
        endpoint: string,
        payload: any,
        headers: Record<string, string>,
        retries = 3
    ): Promise<any> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await axios.post(endpoint, payload, {
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-OAuth-Source': this.defaultDomain,
                        ...headers
                    }
                });
                return response.data;
            } catch (error) {
                if (attempt === retries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
}


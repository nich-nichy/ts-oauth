export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope: string[];
}

export interface OAuthProvider {
    authorizationUrl: string;
    tokenUrl: string;
}

export enum ResponseType {
    JSON = 'json',
    Cookie = 'cookie',
    CrossDomain = 'crossDomain',
}
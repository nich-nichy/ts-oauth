// Usage examples:
const oauth = new OAuth(config, provider);

await oauth.handleCallback(code, ResponseType.CrossDomain, 'subdomain.example.com');

await oauth.handleCallback(code, ResponseType.CrossDomain, {
    protocol: 'https',
    endpoint: '/custom/token-receiver',
    headers: {
        'X-Custom-Header': 'value'
    }
});
/**
 * Winnow Infisical Secret Manager Client
 * Provides zero-leak dynamic environment and credential injection
 * preventing plaintext credentials from ever residing in local or git storage.
 */

export class InfisicalClient {
  constructor(options = {}) {
    this.token = options.token || process.env.INFISICAL_TOKEN;
    this.siteUrl = options.siteUrl || process.env.INFISICAL_SITE_URL || 'https://app.infisical.com';
    this.environment = options.environment || process.env.NODE_ENV || 'production';
    this.cache = new Map();
  }

  async getSecret(key, fallback = undefined) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Direct environment override if explicitly provided
    if (process.env[key]) {
      return process.env[key];
    }

    if (!this.token) {
      return fallback;
    }

    try {
      const res = await fetch(`${this.siteUrl}/api/v3/secrets/raw/${encodeURIComponent(key)}?environment=${this.environment}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!res.ok) {
        return fallback;
      }

      const data = await res.json();
      const val = data.secret?.secretValue ?? fallback;
      this.cache.set(key, val);
      return val;
    } catch (err) {
      return fallback;
    }
  }

  async resolveCriticalSecrets() {
    const [resendApiKey, paystackKey, ddApiKey, ddAppKey] = await Promise.all([
      this.getSecret('RESEND_API_KEY', process.env.RESEND_API_KEY),
      this.getSecret('PAYSTACK_SECRET_KEY', process.env.PAYSTACK_SECRET_KEY),
      this.getSecret('DD_API_KEY', process.env.DD_API_KEY),
      this.getSecret('DD_APP_KEY', process.env.DD_APP_KEY)
    ]);

    return {
      RESEND_API_KEY: resendApiKey,
      PAYSTACK_SECRET_KEY: paystackKey,
      DD_API_KEY: ddApiKey,
      DD_APP_KEY: ddAppKey
    };
  }
}

export const infisical = new InfisicalClient();

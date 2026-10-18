import { AuthenticationError, HttpHelper } from './HttpHelper';
import { AuthStorageHelper } from './AuthStorageHelper';

export interface ChatGptConnection {
  id: string;
  email: string | null;
  label: string;
  status:
    'connected' | 'permission_required' | 'reauth_required' | 'disconnected' | 'revocation_pending';
  planUsageEnabled: boolean;
  expiresAt: string | null;
  welcomeAcknowledged: boolean;
}
export interface ChatGptIntegrationStatus {
  provider: 'chatgpt';
  available: boolean;
  reason: 'setup_required' | null;
  activeConnectionId: string | null;
  connections: ChatGptConnection[];
}
export interface ChatGptModels {
  connectionId: string;
  models: { slug: string; displayName: string }[];
  selectedModel: string | null;
}

const messages: Record<string, string> = {
  CHATGPT_NOT_CONFIGURED: 'Il collegamento ChatGPT non è ancora disponibile su questa istanza.',
  CHATGPT_USAGE_LIMIT: 'Hai raggiunto un limite di utilizzo. Controlla le impostazioni ChatGPT.',
  CHATGPT_NOT_ELIGIBLE:
    'L’account o il workspace selezionato non è abilitato all’uso del piano in questa app.',
  CHATGPT_PERMISSION_REQUIRED: 'Autorizza l’uso del piano ricollegando questo account ChatGPT.',
  CHATGPT_REAUTH_REQUIRED: 'Il collegamento è scaduto o non è più valido. Ricollega ChatGPT.',
  CHATGPT_ACCOUNT_MISMATCH:
    'L’account scelto è diverso da quello da ricollegare. Usa “Aggiungi account”.',
  CHATGPT_CONSENT_DENIED: 'Collegamento annullato: il consenso non è stato concesso.',
  CHATGPT_INVALID_ATTEMPT:
    'Il tentativo è scaduto o il browser non ha restituito il cookie di collegamento. Riprova.',
  CHATGPT_ATTEMPT_SUPERSEDED: 'È stato avviato un altro collegamento. Riprova da questa schermata.',
  CHATGPT_SESSION_REQUIRED: 'Aggiorna la sessione MyBalance accedendo nuovamente.',
  CHATGPT_SESSION_REVOKED: 'La sessione da cui è partito il collegamento non è più valida.',
  CHATGPT_MODEL_UNAVAILABLE: 'Questo modello non è più disponibile. Aggiorna l’elenco.',
  CHATGPT_REVOCATION_PENDING:
    'La disconnessione remota non è ancora confermata. Riprova o revoca l’accesso nelle impostazioni ChatGPT.',
  CHATGPT_STREAM_INTERRUPTED: 'La risposta si è interrotta prima del completamento. Riprova.',
};

export class ChatGptIntegrationError extends Error {
  constructor(
    public code: string,
    public status = 503,
  ) {
    super(messages[code] || 'Il servizio ChatGPT non è disponibile. Riprova tra poco.');
  }
}

const states = [
  'connected',
  'permission_required',
  'reauth_required',
  'disconnected',
  'revocation_pending',
];
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);

export class ChatGptIntegrationApiHelper {
  // OAuth operations go directly to AuthService. AI operations use MyBalance's API.
  private static async request(
    service: 'auth' | 'api',
    path: string,
    method = 'GET',
    body?: object,
    signal?: AbortSignal,
    timeoutMs = 15000,
  ): Promise<any> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await HttpHelper.getValidAccessToken(attempt > 0, true);
      if (!token) throw new AuthenticationError('Sessione MyBalance non valida');
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (signal?.aborted) controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      const timeout = setTimeout(abort, timeoutMs);
      try {
        const response = await fetch(
          `${service === 'auth' ? HttpHelper.authUri : HttpHelper.endpointUri}/integrations/chatgpt${path}`,
          {
            method,
            credentials: 'include',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            ...(body ? { body: JSON.stringify(body) } : {}),
          },
        );
        // Late responses from another app session must never alter the current account.
        if ((await AuthStorageHelper.getTokens())?.accessToken !== token)
          throw new Error('La sessione è cambiata');
        const result = await response.json();
        if (response.status === 401 && attempt === 0) continue;
        if (response.status === 401) {
          await HttpHelper.handleUnauthorized('Sessione MyBalance non valida');
          throw new AuthenticationError('Sessione MyBalance non valida');
        }
        if (!response.ok || !result.success || !result.data)
          throw new ChatGptIntegrationError(
            result.code || 'CHATGPT_REQUEST_FAILED',
            response.status,
          );
        return result.data;
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
      }
    }
    throw new AuthenticationError('Sessione MyBalance non valida');
  }

  private static status(data: any): ChatGptIntegrationStatus {
    if (
      data?.provider !== 'chatgpt' ||
      typeof data.available !== 'boolean' ||
      !Array.isArray(data.connections) ||
      data.reason !== (data.available ? null : 'setup_required')
    )
      throw new ChatGptIntegrationError('CHATGPT_INVALID_STATUS');
    const connections: ChatGptConnection[] = data.connections.map((item: any) => {
      if (
        !validId(item.id) ||
        typeof item.label !== 'string' ||
        !states.includes(item.status) ||
        (item.email !== null && typeof item.email !== 'string') ||
        typeof item.planUsageEnabled !== 'boolean' ||
        typeof item.welcomeAcknowledged !== 'boolean' ||
        (item.expiresAt !== null && !Number.isFinite(Date.parse(item.expiresAt))) ||
        (item.planUsageEnabled && item.status !== 'connected')
      )
        throw new ChatGptIntegrationError('CHATGPT_INVALID_STATUS');
      return {
        id: item.id,
        email: item.email,
        label: item.label,
        status: item.status,
        planUsageEnabled: item.planUsageEnabled,
        expiresAt: item.expiresAt,
        welcomeAcknowledged: item.welcomeAcknowledged,
      };
    });
    if (
      (data.activeConnectionId !== null &&
        !connections.some((item) => item.id === data.activeConnectionId)) ||
      (!data.available && (connections.length > 0 || data.activeConnectionId !== null))
    )
      throw new ChatGptIntegrationError('CHATGPT_INVALID_STATUS');
    return {
      provider: 'chatgpt',
      available: data.available,
      reason: data.reason,
      activeConnectionId: data.activeConnectionId,
      connections,
    };
  }

  static async getStatus(signal?: AbortSignal) {
    return this.status(await this.request('auth', '/status', 'GET', undefined, signal));
  }
  static async authorize(connectionId?: string) {
    const data = await this.request(
      'auth',
      '/authorize',
      'POST',
      connectionId ? { connectionId } : {},
    );
    const url = new URL(data.authorizationUrl);
    if (
      url.origin !== 'https://auth.openai.com' ||
      url.pathname !== '/api/accounts/authorize' ||
      url.username ||
      url.password
    )
      throw new ChatGptIntegrationError('CHATGPT_INVALID_AUTHORIZATION');
    return url.toString();
  }
  static async select(id: string) {
    return this.status(
      await this.request('auth', `/connections/${encodeURIComponent(id)}/select`, 'POST', {}),
    );
  }
  static async acknowledge(id: string) {
    return this.status(
      await this.request('auth', `/connections/${encodeURIComponent(id)}/acknowledge`, 'POST', {}),
    );
  }
  static async disconnect(id: string) {
    const data = await this.request('auth', `/connections/${encodeURIComponent(id)}`, 'DELETE');
    if (typeof data.revocationConfirmed !== 'boolean')
      throw new ChatGptIntegrationError('CHATGPT_INVALID_STATUS');
    return data.revocationConfirmed as boolean;
  }
  static async models(id: string, signal?: AbortSignal): Promise<ChatGptModels> {
    const data = await this.request(
      'api',
      `/models?connectionId=${encodeURIComponent(id)}`,
      'GET',
      undefined,
      signal,
      45000,
    );
    if (
      data.connectionId !== id ||
      !Array.isArray(data.models) ||
      data.models.some(
        (item: any) => typeof item.slug !== 'string' || typeof item.displayName !== 'string',
      ) ||
      (data.selectedModel !== null &&
        !data.models.some((item: any) => item.slug === data.selectedModel))
    )
      throw new ChatGptIntegrationError('CHATGPT_INVALID_MODELS');
    return {
      connectionId: id,
      models: data.models.map((item: any) => ({ slug: item.slug, displayName: item.displayName })),
      selectedModel: data.selectedModel,
    };
  }
  static async setModel(id: string, model: string) {
    const data = await this.request(
      'api',
      '/preferences',
      'PUT',
      { connectionId: id, model },
      undefined,
      45000,
    );
    if (data.connectionId !== id || data.selectedModel !== model)
      throw new ChatGptIntegrationError('CHATGPT_INVALID_MODELS');
  }
  static async test(id: string, model: string, signal?: AbortSignal): Promise<string> {
    const data = await this.request(
      'api',
      '/responses',
      'POST',
      { connectionId: id, model, prompt: 'Rispondi soltanto con: Collegamento ChatGPT riuscito.' },
      signal,
      120000,
    );
    if (data.connectionId !== id || data.model !== model || typeof data.outputText !== 'string')
      throw new ChatGptIntegrationError('CHATGPT_INVALID_RESPONSE');
    return data.outputText;
  }
}

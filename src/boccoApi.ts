import { randomUUID } from 'node:crypto';

const API_BASE = 'https://api.bocco.me/alpha';

interface SessionResponse {
  access_token: string;
}

export interface BoccoRoom {
  uuid: string;
  name: string;
}

export class BoccoApiClient {
  private accessToken: string | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly email: string,
    private readonly password: string,
  ) {}

  private async authenticate(): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ apikey: this.apiKey, email: this.email, password: this.password }).toString(),
    });

    if (!res.ok) {
      throw new Error(`BOCCO auth failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as SessionResponse;
    this.accessToken = data.access_token;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken) {
      await this.authenticate();
    }
  }

  async getRooms(): Promise<BoccoRoom[]> {
    await this.ensureAuthenticated();

    const url = new URL(`${API_BASE}/rooms/joined`);
    url.searchParams.set('access_token', this.accessToken!);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch rooms: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<BoccoRoom[]>;
  }

  async sendMessage(roomUuid: string, text: string): Promise<void> {
    await this.ensureAuthenticated();

    let res = await this.postMessage(roomUuid, text);

    if (res.status === 401) {
      await this.authenticate();
      res = await this.postMessage(roomUuid, text);
    }

    if (res.status === 404) {
      throw new Error(`Room not found (404). Check roomUuid "${roomUuid}" in the plugin settings.`);
    }

    if (!res.ok) {
      throw new Error(`Failed to send message: ${res.status} ${res.statusText}`);
    }
  }

  private postMessage(roomUuid: string, text: string): Promise<Response> {
    return fetch(`${API_BASE}/rooms/${roomUuid}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token: this.accessToken!,
        unique_id: randomUUID(),
        media: 'text',
        text,
      }).toString(),
    });
  }
}

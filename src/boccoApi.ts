import { randomUUID } from 'node:crypto';

const BOCCO_API_BASE = 'https://api.bocco.me/alpha';

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

  async authenticate(): Promise<void> {
    const response = await fetch(`${BOCCO_API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        apikey: this.apiKey,
        email: this.email,
        password: this.password,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`BOCCO authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as SessionResponse;
    this.accessToken = data.access_token;
  }

  async getJoinedRooms(): Promise<BoccoRoom[]> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const url = new URL(`${BOCCO_API_BASE}/rooms/joined`);
    url.searchParams.set('access_token', this.accessToken!);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to fetch BOCCO rooms: ${response.status} ${response.statusText}`);
    }

    return await response.json() as BoccoRoom[];
  }

  async sendTextMessage(roomUuid: string, text: string): Promise<void> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    let response = await this.postMessage(roomUuid, text);

    // Re-authenticate and retry once if the session token expired
    if (response.status === 401) {
      await this.authenticate();
      response = await this.postMessage(roomUuid, text);
    }

    if (response.status === 404) {
      throw new Error(`BOCCO room not found (404). Check that roomUuid "${roomUuid}" is correct. Use the Homebridge logs at startup to see your available rooms.`);
    }

    if (!response.ok) {
      throw new Error(`Failed to send BOCCO message: ${response.status} ${response.statusText}`);
    }
  }

  private postMessage(roomUuid: string, text: string): Promise<Response> {
    return fetch(`${BOCCO_API_BASE}/rooms/${roomUuid}/messages`, {
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

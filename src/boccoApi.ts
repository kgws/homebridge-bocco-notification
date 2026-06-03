import { randomUUID } from 'node:crypto';

// BOCCO API のベース URL
const API_BASE = 'https://api.bocco.me/alpha';

// POST /sessions のレスポンス型
interface SessionResponse {
  access_token: string;
}

// ルーム情報の型
export interface BoccoRoom {
  uuid: string;
  name: string;
}

// BOCCO API との通信を担当するクライアント
// アクセストークンをインスタンス内にキャッシュし、有効期限切れ時は自動で再認証する
export class BoccoApiClient {
  // 認証後に取得したアクセストークン（未認証時は null）
  private accessToken: string | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly email: string,
    private readonly password: string,
  ) {}

  // apiKey・email・password でセッションを作成し、アクセストークンを取得する
  private async authenticate(): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ apikey: this.apiKey, email: this.email, password: this.password }).toString(),
    });

    if (!res.ok) {
      throw new Error(`BOCCO auth failed: ${res.status} ${res.statusText}`);
    }

    // レスポンスからアクセストークンを取り出してキャッシュする
    const data = await res.json() as SessionResponse;
    this.accessToken = data.access_token;
  }

  // アクセストークンがない場合だけ認証を行う（重複認証を防ぐ）
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken) {
      await this.authenticate();
    }
  }

  // 自分が参加しているルームの一覧を取得する
  async getRooms(): Promise<BoccoRoom[]> {
    await this.ensureAuthenticated();

    // アクセストークンはクエリストリングで渡す（BOCCO API の仕様）
    const url = new URL(`${API_BASE}/rooms/joined`);
    url.searchParams.set('access_token', this.accessToken!);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch rooms: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<BoccoRoom[]>;
  }

  // 指定ルームにテキストメッセージを送信する
  // トークン有効期限切れ（401）の場合は再認証して1回だけリトライする
  async sendMessage(roomUuid: string, text: string): Promise<void> {
    await this.ensureAuthenticated();

    let res = await this.postMessage(roomUuid, text);

    // 401 はトークン期限切れの可能性があるため、再認証して再試行する
    if (res.status === 401) {
      await this.authenticate();
      res = await this.postMessage(roomUuid, text);
    }

    // 404 はルームが見つからない場合。設定ミスが多いため具体的なメッセージを表示する
    if (res.status === 404) {
      throw new Error(`Room not found (404). Check roomUuid "${roomUuid}" in the plugin settings.`);
    }

    if (!res.ok) {
      throw new Error(`Failed to send message: ${res.status} ${res.statusText}`);
    }
  }

  // メッセージ送信リクエストを実行する
  // unique_id は BOCCO API の冪等性保証に必要なため、毎回 UUID v4 を生成して付与する
  // （同じ unique_id のメッセージは重複送信されない）
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

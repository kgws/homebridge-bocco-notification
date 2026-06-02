import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';

const BOCCO_API_BASE = 'https://api.bocco.me/alpha';

class BoccoUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    this.onRequest('/rooms', this.fetchRooms.bind(this));
    this.ready();
  }

  async fetchRooms({ api_key, email, password }) {
    const authRes = await fetch(`${BOCCO_API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ apikey: api_key, email, password }).toString(),
    });

    if (!authRes.ok) {
      throw new RequestError('Authentication failed. Check your API key, email, and password.');
    }

    const { access_token } = await authRes.json();

    const url = new URL(`${BOCCO_API_BASE}/rooms/joined`);
    url.searchParams.set('access_token', access_token);

    const roomsRes = await fetch(url.toString());
    if (!roomsRes.ok) {
      throw new RequestError('Failed to fetch rooms from BOCCO.');
    }

    const rooms = await roomsRes.json();
    return rooms.map(({ uuid, name }) => ({ uuid, name }));
  }
}

new BoccoUiServer();

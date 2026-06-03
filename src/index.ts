import type { API } from 'homebridge';

import { BoccoNotificationPlatform } from './platform.js';
import { PLATFORM_NAME } from './settings.js';

// Homebridge がプラグインを読み込む際に呼び出されるエントリーポイント
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, BoccoNotificationPlatform);
};

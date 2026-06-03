// プラットフォーム名は config.schema.json の pluginAlias と一致させる必要がある
export const PLATFORM_NAME = 'BoccoNotification';
export const PLUGIN_NAME = 'homebridge-bocco-notification';

// Homebridge の config.json に記述する通知ボタン1件分の設定
export interface MessageConfig {
  name: string;     // HomeKit に表示するスイッチ名
  roomUuid: string; // メッセージ送信先の BOCCO ルーム UUID
  text: string;     // 送信するテキスト
}

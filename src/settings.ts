export const PLATFORM_NAME = 'BoccoNotification';
export const PLUGIN_NAME = 'homebridge-bocco-notification';

export interface MessageConfig {
  name: string;
  roomUuid: string;
  text: string;
}

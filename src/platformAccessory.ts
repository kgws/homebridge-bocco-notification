import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { BoccoNotificationPlatform } from './platform.js';

// スイッチをオフに戻すまでの待機時間（ミリ秒）
const AUTO_OFF_DELAY_MS = 1000;

// 通知スイッチ1つを表すアクセサリクラス
// スイッチをオンにすると BOCCO にメッセージを送信し、1秒後に自動でオフに戻るモーメンタリ動作をする
export class BoccoNotificationAccessory {
  private readonly service: Service;

  constructor(
    private readonly platform: BoccoNotificationPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // HomeKit のアクセサリ情報（メーカー・モデル・シリアル番号）を設定する
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BOCCO')
      .setCharacteristic(this.platform.Characteristic.Model, 'Notification Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.UUID);

    // スイッチサービスを取得する
    // キャッシュ復元時は既存のサービスを再利用し、新規登録時は新しく追加する
    this.service = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    // HomeKit のアクセサリ名を設定する
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.message.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(() => false)                                    // スイッチは常にオフを返す（モーメンタリ動作のため）
      .onSet(this.handleSwitchOn.bind(this));                // オン操作時の処理を登録する
  }

  // スイッチがオンになったときの処理
  private async handleSwitchOn(value: CharacteristicValue) {
    // オフへの変更（自動リセット時）は無視する
    if (!value) {
      return;
    }

    const { roomUuid, text } = this.accessory.context.message;

    // BOCCO にメッセージを送信する
    try {
      await this.platform.boccoClient.sendMessage(roomUuid, text);
      this.platform.log.info(`Sent message to room "${roomUuid}": "${text}"`);
    } catch (error) {
      this.platform.log.error('Failed to send message:', error);
    }

    // 送信完了後にスイッチをオフに戻す（押した感を出すため少し待ってからリセットする）
    setTimeout(() => {
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }, AUTO_OFF_DELAY_MS);
  }
}

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { BoccoNotificationPlatform } from './platform.js';

const AUTO_OFF_DELAY_MS = 1000;

export class BoccoNotificationAccessory {
  private readonly service: Service;

  constructor(
    private readonly platform: BoccoNotificationPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BOCCO')
      .setCharacteristic(this.platform.Characteristic.Model, 'Notification Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.UUID);

    this.service = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.message.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(() => false)
      .onSet(this.handleSwitchOn.bind(this));
  }

  private async handleSwitchOn(value: CharacteristicValue) {
    if (!value) {
      return;
    }

    const { roomUuid, text } = this.accessory.context.message;

    try {
      await this.platform.boccoClient.sendTextMessage(roomUuid, text);
      this.platform.log.info(`Sent BOCCO notification to room "${roomUuid}": "${text}"`);
    } catch (error) {
      this.platform.log.error('Failed to send BOCCO notification:', error);
    }

    // Momentary switch: auto-reset to off after sending
    setTimeout(() => {
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }, AUTO_OFF_DELAY_MS);
  }
}

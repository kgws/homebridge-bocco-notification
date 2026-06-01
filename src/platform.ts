import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { BoccoApiClient } from './boccoApi.js';
import { BoccoNotificationAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import type { MessageConfig } from './settings.js';

export class BoccoNotificationPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly boccoClient: BoccoApiClient;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.boccoClient = new BoccoApiClient(
      config.api_key as string,
      config.email as string,
      config.password as string,
    );

    this.api.on('didFinishLaunching', () => {
      this.logAvailableRooms();
      this.setupNotificationSwitches();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.set(accessory.UUID, accessory);
  }

  private async logAvailableRooms() {
    try {
      const rooms = await this.boccoClient.getJoinedRooms();
      this.log.info('Available BOCCO rooms:');
      for (const room of rooms) {
        this.log.info(`  roomUuid: "${room.uuid}"  name: "${room.name}"`);
      }
    } catch (error) {
      this.log.warn('Could not fetch BOCCO room list:', error);
    }
  }

  private setupNotificationSwitches() {
    const messages: MessageConfig[] = (this.config.messages as MessageConfig[]) ?? [];
    const registeredUUIDs: string[] = [];

    for (const message of messages) {
      if (!message.roomUuid) {
        this.log.warn(`Skipping button "${message.name}": roomUuid is not set. Please configure it in the plugin settings.`);
        continue;
      }

      const uuid = this.api.hap.uuid.generate(message.name);
      registeredUUIDs.push(uuid);

      const existingAccessory = this.accessories.get(uuid);
      if (existingAccessory) {
        this.log.info('Restoring notification switch from cache:', existingAccessory.displayName);
        existingAccessory.context.message = message;
        this.api.updatePlatformAccessories([existingAccessory]);
        new BoccoNotificationAccessory(this, existingAccessory);
      } else {
        this.log.info('Registering new notification switch:', message.name);
        const accessory = new this.api.platformAccessory(message.name, uuid);
        accessory.context.message = message;
        new BoccoNotificationAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // Remove switches that are no longer present in the config
    for (const [uuid, accessory] of this.accessories) {
      if (!registeredUUIDs.includes(uuid)) {
        this.log.info('Removing stale notification switch:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}

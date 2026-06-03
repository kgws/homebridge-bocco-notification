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
      this.logRoomList();
      this.setupSwitches();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.set(accessory.UUID, accessory);
  }

  private async logRoomList() {
    try {
      const rooms = await this.boccoClient.getRooms();
      this.log.info('Available BOCCO rooms:');
      for (const room of rooms) {
        this.log.info(`  name: "${room.name}"  roomUuid: "${room.uuid}"`);
      }
    } catch (error) {
      this.log.warn('Could not fetch room list:', error);
    }
  }

  private setupSwitches() {
    const messages: MessageConfig[] = (this.config.messages as MessageConfig[]) ?? [];
    const registeredUUIDs = new Set<string>();

    for (const message of messages) {
      if (!message.roomUuid) {
        this.log.warn(`Skipping "${message.name}": roomUuid is not set.`);
        continue;
      }

      const uuid = this.api.hap.uuid.generate(message.name);
      registeredUUIDs.add(uuid);

      const existing = this.accessories.get(uuid);
      if (existing) {
        this.log.info('Restoring switch from cache:', existing.displayName);
        existing.context.message = message;
        this.api.updatePlatformAccessories([existing]);
        new BoccoNotificationAccessory(this, existing);
      } else {
        this.log.info('Registering new switch:', message.name);
        const accessory = new this.api.platformAccessory(message.name, uuid);
        accessory.context.message = message;
        new BoccoNotificationAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    for (const [uuid, accessory] of this.accessories) {
      if (!registeredUUIDs.has(uuid)) {
        this.log.info('Removing stale switch:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}

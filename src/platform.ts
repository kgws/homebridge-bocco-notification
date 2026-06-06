import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { BoccoApiClient } from './boccoApi.js';
import { BoccoNotificationAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import type { MessageConfig } from './settings.js';

// プラグイン全体を管理するプラットフォームクラス
// Homebridge 起動時に config.json を読み込み、通知スイッチをアクセサリとして登録する
export class BoccoNotificationPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // Homebridge がキャッシュから復元したアクセサリを UUID をキーに保持する
  // 再起動をまたいでアクセサリの状態を維持するために使う
  public readonly accessories: Map<string, PlatformAccessory> = new Map();

  public readonly boccoClient: BoccoApiClient;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    // config.json の認証情報を使って BOCCO API クライアントを初期化する
    this.boccoClient = new BoccoApiClient(
      config.api_key as string,
      config.email as string,
      config.password as string,
    );

    // didFinishLaunching 後にスイッチを登録する
    // このイベントより前に registerPlatformAccessories を呼ぶと重複登録エラーになる
    this.api.on('didFinishLaunching', () => {
      this.setupSwitches();
    });
  }

  // Homebridge がキャッシュからアクセサリを復元する際に呼ばれる
  // 復元したアクセサリを accessories マップに追加しておく
  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.set(accessory.UUID, accessory);
  }

  // config.json の messages 配列をもとに通知スイッチを登録・更新・削除する
  private setupSwitches() {
    const messages: MessageConfig[] = (this.config.messages as MessageConfig[]) ?? [];

    // 今回の設定に含まれる UUID を記録し、後で削除対象の特定に使う
    const registeredUUIDs = new Set<string>();

    for (const message of messages) {
      // roomUuid が未設定のボタンはスキップする（スイッチを登録しても送信先がないため）
      if (!message.roomUuid) {
        this.log.warn(`Skipping "${message.name}": roomUuid is not set.`);
        continue;
      }

      // アクセサリの UUID はスイッチ名から生成する
      // 名前が同じなら再起動をまたいでも同じ UUID になるため、キャッシュと照合できる
      const uuid = this.api.hap.uuid.generate(message.name);
      registeredUUIDs.add(uuid);

      const existing = this.accessories.get(uuid);
      if (existing) {
        // キャッシュに存在する場合は設定を最新化して再利用する（新規登録はしない）
        this.log.info('Restoring switch from cache:', existing.displayName);
        existing.context.message = message;
        this.api.updatePlatformAccessories([existing]);
        new BoccoNotificationAccessory(this, existing);
      } else {
        // キャッシュにない場合は新規アクセサリを作成して登録する
        this.log.info('Registering new switch:', message.name);
        const accessory = new this.api.platformAccessory(message.name, uuid);
        accessory.context.message = message;
        new BoccoNotificationAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // config から削除されたスイッチをキャッシュからも取り除く
    // 残したままにすると HomeKit 上に不要なスイッチが残り続けてしまう
    for (const [uuid, accessory] of this.accessories) {
      if (!registeredUUIDs.has(uuid)) {
        this.log.info('Removing stale switch:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}

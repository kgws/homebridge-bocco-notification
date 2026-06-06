<p align="center">
  <img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

<span align="center">

# Homebridge BOCCO Notification

[![npm version](https://img.shields.io/npm/v/homebridge-bocco-notification)](https://www.npmjs.com/package/homebridge-bocco-notification)
[![npm downloads](https://img.shields.io/npm/dt/homebridge-bocco-notification)](https://www.npmjs.com/package/homebridge-bocco-notification)

</span>

The Homebridge [BOCCO](https://bocco.me/) plugin allows you to send push notifications through BOCCO from [HomeKit](https://www.apple.com/home-app/) with [Homebridge](https://homebridge.io/).

Each notification is exposed as a switch accessory in HomeKit. Turning the switch on sends a text message to a specified BOCCO room, enabling you to trigger BOCCO notifications from HomeKit automations and Siri.

---

## Installation

1. Search for **"BOCCO Notification"** on the plugin screen of [Homebridge Config UI X](https://github.com/homebridge/homebridge-config-ui-x)
2. Find: `homebridge-bocco-notification`
3. Click **Install**

---

## Prerequisites

You will need the following before configuring the plugin:

- A [BOCCO](https://bocco.me/) account (email and password)
- A BOCCO API key — obtain one from the [BOCCO API portal](https://api.bocco.me/)
- The UUID of the BOCCO room you want to send messages to (available via the plugin's Custom UI)

---

## Configuration

Configure the plugin via the Homebridge Config UI X settings page.

### Required Settings

| Field | Description |
|-------|-------------|
| `api_key` | Your BOCCO API key |
| `email` | Your BOCCO account email address |
| `password` | Your BOCCO account password |

### Notification Switches

You can add multiple notification switches, each mapped to a BOCCO room and a message text.

| Field | Description |
|-------|-------------|
| `name` | Display name shown in the Home app |
| `roomUuid` | UUID of the BOCCO room to send the message to |
| `text` | Text message to send when the switch is triggered |

The Room UUID can be selected from a dropdown in the plugin's Custom UI — it is fetched automatically from the BOCCO API using your credentials.

### Example `config.json`

```json
{
  "platforms": [
    {
      "platform": "BoccoNotification",
      "name": "Bocco Notification",
      "api_key": "your-api-key",
      "email": "your@email.com",
      "password": "your-password",
      "messages": [
        {
          "name": "Good Morning",
          "roomUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "text": "Good morning!"
        }
      ]
    }
  ]
}
```

---

## How It Works

1. When a notification switch is turned **on** in HomeKit, the plugin sends the configured text message to the specified BOCCO room via the BOCCO API.
2. The switch turns itself **off** automatically after the message is sent.
3. Authentication tokens are cached and refreshed automatically — no manual re-authentication needed.

---

## Troubleshooting

### Message not sent

- Verify your `api_key`, `email`, and `password` are correct.
- Check that the `roomUuid` matches a room you have joined in the BOCCO app.
- Check the Homebridge logs for error messages.

### Room UUID not appearing in the dropdown

- Ensure your credentials are saved correctly in the plugin settings.
- Try reloading the plugin settings page.

---

## Development

### Install dependencies

```shell
npm install
```

### Build

```shell
npm run build
```

### Watch for changes

```shell
npm run watch
```

### Lint

```shell
npm run lint
```

---

## BOCCO API

- [BOCCO API Documentation](https://api.bocco.me/)

---

## Support / Donate

If this plugin is useful to you, please consider supporting its development!

<p align="center">
  <a href="https://ko-fi.com/kgws"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi"></a>
</p>

---

## License

Apache-2.0 © [kgws](https://kgws.hatenablog.com/)

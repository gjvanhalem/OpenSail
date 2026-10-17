# OpenSail bridge: Wi-Fi instruments over TCP/UDP → WebSocket

Most Wi-Fi instrument gateways and autopilots send NMEA 0183 over a plain **TCP** or **UDP** connection. A web app can't open those: browsers only allow **WebSocket**. The bridge is a small Node.js script you run on the same laptop as OpenSail. It connects to the gateway and passes the data on to OpenSail over `ws://localhost`.

```
autopilot / gateway ──TCP 20220──► bridge (on your laptop) ──ws://localhost:10110──► OpenSail (browser)
```

It has no dependencies. Node.js 18 or newer is enough.

## Pcnautic Easy Tiller Pilot (pypilot)

The autopilot makes its own Wi-Fi network, `pcnautic_AP`, and runs an NMEA 0183 server on **192.168.14.1, TCP port 20220**. Those are the bridge's defaults.

1. Join the `pcnautic_AP` Wi-Fi network on your laptop.
2. Start the bridge:
   ```bash
   node tools/opensail-bridge/bridge.mjs
   ```
   It prints `Connected to 192.168.14.1:20220` once the autopilot answers, and keeps retrying if it doesn't.
3. In OpenSail: **Instruments → Wi-Fi**, address `ws://localhost:10110`, protocol **NMEA 0183**, then **Connect over Wi-Fi**.
4. In **Settings → Navigation Sources**, set the **magnetic variation**. The autopilot sends a *magnetic* heading (`HDM`). In the Netherlands the variation is about 2° east.

What the autopilot sends, according to Pcnautic's manual: magnetic heading (`APHDM`), rudder angle (`APRSA`), heel and pitch (`APXDR`) and, if a wind sensor is connected to the pilot, wind (`APMWV`). It sends **no position or depth**: keep the laptop's GPS on for those. If the autopilot joined another network (client mode), its address is shown in the ControlHead's Wi-Fi menu. Use that address with `--target`.

## Other gateways

```bash
node tools/opensail-bridge/bridge.mjs --target 192.168.4.1:10110   # TCP NMEA server
node tools/opensail-bridge/bridge.mjs --udp 10110                  # NMEA broadcast over UDP
```

| Option | Default | |
|---|---|---|
| `--target host:port` | `192.168.14.1:20220` | NMEA TCP server to connect to |
| `--udp port` | | listen for NMEA over UDP instead of TCP |
| `--port port` | `10110` | WebSocket port for OpenSail |
| `--listen address` | `127.0.0.1` | only this laptop can connect; use `0.0.0.0` to share the stream on the network |
| `--allow-write` | off | forward sentences from OpenSail to the target |

`http://localhost:10110` in a browser shows the bridge status.

## Read-only by default

Any website open in your browser can reach `ws://localhost` too, so the bridge drops everything an app sends unless you start it with `--allow-write`. Sending matters later, when OpenSail sends a route (`RMC`/`APB`) for the autopilot to steer. Only use `--allow-write` when you need that.

## Phones and tablets

A phone can't run the bridge, and its browser can't open TCP. On a phone, OpenSail would need to be packaged as an installable app that opens the TCP connection itself. That's planned separately. A laptop or Raspberry Pi on board can run the bridge with `--listen 0.0.0.0` for other devices. But a page loaded over HTTPS may only open an unencrypted `ws://` link to `localhost`, so the phone would have to load OpenSail over plain HTTP from the boat's network.

## Tests

```bash
node --test tools/opensail-bridge/bridge.test.mjs   # Node 22+
```

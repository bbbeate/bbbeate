# rass

flic button controllers for hue lights on raspberry pi.

## flic0 - main button

- click: toggle lights
- hold: night mode
- double-click: orange mode

## flic1 - bedroom button

- click: toggle sparkle (nattlys only) / all off
- double-click: half moon (night mode, all lights)
- hold: full moon (on mode, all lights)

## flic2 - boomblaster button

- click: play/pause
- double-click: power
- hold: vol up

## ir-projector - samsung projector

listens for samsung projector power IR signal (gpio 17), turns off all hue lights.
runs as `ir-projector` systemd service on the pi.

## ir hardware setup

raspberry pi with ir transmitter (sending) and ir receiver on gpio.

### transmitter (sending ir to boomblaster/projector)

```
gpio 18 (pin 12) ---[200 ohm]---> 2n2222 base (middle leg)
5v (pin 2) ----> ir led (+) ----> ir led (-) ----> 2n2222 collector (right leg)
2n2222 emitter (left leg) ----> gnd (pin 6)
```

2n2222 pinout: flat side facing you, left=E, middle=B, right=C.

device: `/dev/lirc0` (gpio-ir-tx overlay on gpio 18)

### receiver (listening for remote signals)

```
ir receiver data ----> gpio 17 (pin 11)
ir receiver vcc  ----> 3.3v (pin 1)
ir receiver gnd  ----> gnd (pin 6)
```

device: `/dev/lirc1` (gpio-ir overlay on gpio 17)

### system config

`/boot/firmware/config.txt`:
```
dtoverlay=gpio-ir-tx,gpio_pin=18
dtoverlay=gpio-ir,gpio_pin=17
```

lircd enabled on boot (`systemctl enable lircd`), device set to `/dev/lirc0` in `/etc/lirc/lirc_options.conf`.

boomblaster commands use `ir-ctl` directly (nec32 protocol), see `hjemme/api/boomblaster.md` for codes.

## setup

requires `.env` with hue bridge credentials.

set `BUTTON_ADDR` in flic1.py and `FLIC1_ADDR` in flic0.py to the new button's bd address.

to pair a new button (flicd is already running):
```
python3 /home/bbbeate/fliclib-linux-hci/clientlib/python/new_scan_wizard.py
# press the button when prompted - it'll print the bd address
```

settings are read from `hjemme/hue_settings.json` (shared with the hjemme app).

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

## setup

requires `.env` with hue bridge credentials.

set `BUTTON_ADDR` in flic1.py and `FLIC1_ADDR` in flic0.py to the new button's bd address.

to pair a new button (flicd is already running):
```
python3 /home/bbbeate/fliclib-linux-hci/clientlib/python/new_scan_wizard.py
# press the button when prompted - it'll print the bd address
```

settings are read from `hjemme/hue_settings.json` (shared with the hjemme app).

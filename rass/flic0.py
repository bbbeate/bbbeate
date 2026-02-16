#!/usr/bin/env python3
# flic0 - flic button controller for hue lights
# click: toggle on/off
# hold: night mode
# double click: orange mode

import sys
import os

# load ../.env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

sys.path.append('/home/bbbeate/fliclib-linux-hci/clientlib/python')
import fliclib
import requests
import urllib3
import json
urllib3.disable_warnings()

HUE_IP = os.getenv('HUE_IP', '10.0.0.1')
HUE_USER = os.getenv('VITE_HUE_USERNAME', '')
GROUP_ID = '3f7d742d-7bbe-4abc-bc4e-593fe15783de'
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), '..', 'hjemme', 'settings.json')

def load_settings():
    try:
        with open(SETTINGS_FILE) as f:
            return json.load(f)
    except:
        return {
            'on': {'mirek': 300, 'brightness': 100},
            'night': {'color': '#ff9933', 'brightness': 27},
            'orange': {'color': '#ff6600', 'brightness': 100}
        }

light_state = False

def hex_to_xy(hex_color):
    r = int(hex_color[1:3], 16) / 255
    g = int(hex_color[3:5], 16) / 255
    b = int(hex_color[5:7], 16) / 255

    rr = pow((r + 0.055) / 1.055, 2.4) if r > 0.04045 else r / 12.92
    gg = pow((g + 0.055) / 1.055, 2.4) if g > 0.04045 else g / 12.92
    bb = pow((b + 0.055) / 1.055, 2.4) if b > 0.04045 else b / 12.92

    X = rr * 0.4124 + gg * 0.3576 + bb * 0.1805
    Y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722
    Z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505

    total = X + Y + Z
    return {'x': X / total, 'y': Y / total} if total else {'x': 0, 'y': 0}

def hue_command(body):
    url = f'https://{HUE_IP}/clip/v2/resource/grouped_light/{GROUP_ID}'
    requests.put(url, json=body, headers={'hue-application-key': HUE_USER}, verify=False)

def toggle():
    global light_state
    settings = load_settings()
    if light_state:
        hue_command({'on': {'on': False}})
    else:
        hue_command({
            'on': {'on': True},
            'dimming': {'brightness': settings['on']['brightness']},
            'color_temperature': {'mirek': settings['on']['mirek']}
        })
    light_state = not light_state

def night_mode():
    global light_state
    settings = load_settings()
    xy = hex_to_xy(settings['night']['color'])
    hue_command({
        'on': {'on': True},
        'dimming': {'brightness': settings['night']['brightness']},
        'color': {'xy': xy}
    })
    light_state = True

def orange_mode():
    global light_state
    settings = load_settings()
    xy = hex_to_xy(settings['orange']['color'])
    hue_command({
        'on': {'on': True},
        'dimming': {'brightness': settings['orange']['brightness']},
        'color': {'xy': xy}
    })
    light_state = True

def on_button_event(channel, click_type, was_queued, time_diff):
    if click_type == fliclib.ClickType.ButtonSingleClick:
        print('click -> toggle')
        toggle()
    elif click_type == fliclib.ClickType.ButtonHold:
        print('hold -> night')
        night_mode()
    elif click_type == fliclib.ClickType.ButtonDoubleClick:
        print('double -> orange')
        orange_mode()

client = fliclib.FlicClient('localhost')

def got_info(items):
    for bd_addr in items['bd_addr_of_verified_buttons']:
        cc = fliclib.ButtonConnectionChannel(bd_addr)
        cc.on_button_single_or_double_click_or_hold = on_button_event
        client.add_connection_channel(cc)
        print(f'connected to {bd_addr}')

client.get_info(got_info)
client.handle_events()

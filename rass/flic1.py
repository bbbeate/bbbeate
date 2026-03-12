#!/usr/bin/env python3
# flic1 - bedroom flic button
# click: toggle sparkle (nattlys only) / all off
# double click: half moon (night mode, all lights)
# hold: full moon (on mode, all lights)

import sys
import os
import time

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
NATTLYS1 = 'd539b9a8-8ece-4a4b-838b-354ae5375b37'
NATTLYS2 = '3d005f56-dbae-486a-afaf-feb45b657b2d'
BUTTON_ADDR = '80:e4:da:78:86:b6'
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), '..', 'hjemme', 'hue_settings.json')

def load_settings():
    defaults = {
        'on': {'mirek': 300, 'brightness': 100},
        'night': {'color': '#ff9933', 'brightness': 27},
        'orange': {'color': '#ff6600', 'brightness': 100},
        'sparkle': {'mirek': 300, 'brightness': 50}
    }
    try:
        with open(SETTINGS_FILE) as f:
            saved = json.load(f)
        return {**defaults, **saved}
    except:
        return defaults

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

def hue_group_command(body):
    url = f'https://{HUE_IP}/clip/v2/resource/grouped_light/{GROUP_ID}'
    requests.put(url, json=body, headers={'hue-application-key': HUE_USER}, verify=False)

def hue_light_command(light_id, body):
    url = f'https://{HUE_IP}/clip/v2/resource/light/{light_id}'
    requests.put(url, json=body, headers={'hue-application-key': HUE_USER}, verify=False)

sparkle_on = False

def sparkle_toggle():
    global sparkle_on
    settings = load_settings()
    if sparkle_on:
        hue_group_command({'on': {'on': False}})
    else:
        hue_group_command({'on': {'on': False}})
        time.sleep(0.5)
        nattlys_body = {
            'on': {'on': True},
            'dimming': {'brightness': settings['sparkle']['brightness']},
            'color_temperature': {'mirek': settings['sparkle']['mirek']}
        }
        hue_light_command(NATTLYS1, nattlys_body)
        hue_light_command(NATTLYS2, nattlys_body)
    sparkle_on = not sparkle_on

def half_moon():
    global sparkle_on
    settings = load_settings()
    xy = hex_to_xy(settings['night']['color'])
    hue_group_command({
        'on': {'on': True},
        'dimming': {'brightness': settings['night']['brightness']},
        'color': {'xy': xy}
    })
    sparkle_on = False

def full_moon():
    global sparkle_on
    settings = load_settings()
    hue_group_command({
        'on': {'on': True},
        'dimming': {'brightness': settings['on']['brightness']},
        'color_temperature': {'mirek': settings['on']['mirek']}
    })
    sparkle_on = False

def on_button_event(channel, click_type, was_queued, time_diff):
    if click_type == fliclib.ClickType.ButtonSingleClick:
        print('click -> sparkle toggle')
        sparkle_toggle()
    elif click_type == fliclib.ClickType.ButtonDoubleClick:
        print('double -> half moon')
        half_moon()
    elif click_type == fliclib.ClickType.ButtonHold:
        print('hold -> full moon')
        full_moon()

client = fliclib.FlicClient('localhost')

def got_info(items):
    for bd_addr in items['bd_addr_of_verified_buttons']:
        if bd_addr == BUTTON_ADDR:
            cc = fliclib.ButtonConnectionChannel(bd_addr)
            cc.on_button_single_or_double_click_or_hold = on_button_event
            client.add_connection_channel(cc)
            print(f'flic1 connected to {bd_addr}')

client.get_info(got_info)
client.handle_events()

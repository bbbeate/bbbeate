#!/usr/bin/env python3
# flic2 - boomblaster flic button
# click: play/pause
# double click: power
# hold: vol up

import sys
import os
import subprocess

sys.path.append('/home/bbbeate/fliclib-linux-hci/clientlib/python')
import fliclib

BUTTON_ADDR = '80:e4:da:78:86:f7'

def ir_send(code):
    subprocess.run([
        'sudo', 'ir-ctl', '-d', '/dev/lirc0',
        '-c', '36000', '-D', '33', '-S', f'nec32:{code}'
    ], check=True)

def on_button_event(channel, click_type, was_queued, time_diff):
    if click_type == fliclib.ClickType.ButtonSingleClick:
        print('click -> play/pause')
        ir_send('0x02FD19E6')
    elif click_type == fliclib.ClickType.ButtonDoubleClick:
        print('double -> power')
        ir_send('0x02FD9C63')
    elif click_type == fliclib.ClickType.ButtonHold:
        print('hold -> vol up')
        ir_send('0x02FD02FD')

client = fliclib.FlicClient('localhost')

def got_info(items):
    for bd_addr in items['bd_addr_of_verified_buttons']:
        if bd_addr == BUTTON_ADDR:
            cc = fliclib.ButtonConnectionChannel(bd_addr)
            cc.on_button_single_or_double_click_or_hold = on_button_event
            client.add_connection_channel(cc)
            print(f'flic2 connected to {bd_addr}')

client.get_info(got_info)
client.handle_events()

# BoomBlaster

## JVC BoomBlaster RV-NB300DAB IR remote codes (NEC protocol)

IR remote control via raspberry pi + ir-ctl (lirc).
parsed by `boomBlaster.js` vite plugin → `POST /api/boomBlaster/<command>`.
used by flic2.py for physical button control.

device: /dev/lirc0
carrier: 36000
duty: 33
protocol: nec32

address byte: 0x02FD (all commands share this prefix)

## power
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD9C63`

## play_pause
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD19E6`

## vol_up
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD02FD`

## vol_down
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD01FE`

## mute
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD03FC`

## next
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD41BE`

## prev
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD40BF`

## source
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD5AA5`

## lights
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD07F8`

## set_time
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD04FB`

## sleep
`sudo ir-ctl -d /dev/lirc0 -c 36000 -D 33 -S nec32:0x02FD05FA`

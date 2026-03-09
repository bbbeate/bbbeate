#!/usr/bin/env python3
# ir-projector - watch for samsung projector power IR signal, turn off lights

import os, struct, time, requests, urllib3
urllib3.disable_warnings()

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

HUE_IP = os.getenv("VITE_HUE_BRIDGE_IP", "10.0.0.1")
HUE_USER = os.getenv("VITE_HUE_USERNAME", "")
GROUP_ID = "3f7d742d-7bbe-4abc-bc4e-593fe15783de"

# reference power signal (pulse durations only, ignoring spaces)
REF_PULSES = [1212, 423, 423, 421, 430, 427, 403, 421, 420, 405, 404, 400, 424]
TOLERANCE = 0.35
MIN_SIGNAL_LEN = 20

def match_signal(pulses):
    if len(pulses) < len(REF_PULSES):
        return False
    p = [d for t, d in pulses if t == "p"]
    if len(p) < len(REF_PULSES):
        return False
    for ref, got in zip(REF_PULSES, p[:len(REF_PULSES)]):
        if abs(got - ref) > ref * TOLERANCE:
            return False
    return True

def lights_off():
    url = f"https://{HUE_IP}/clip/v2/resource/grouped_light/{GROUP_ID}"
    try:
        requests.put(url, json={"on": {"on": False}},
                     headers={"hue-application-key": HUE_USER}, verify=False, timeout=3)
        print("lights off")
    except Exception as e:
        print(f"hue error: {e}")

def main():
    fd = os.open("/dev/lirc1", os.O_RDONLY)
    print("ir-projector: listening on /dev/lirc1...")

    samples = []
    last_action = 0

    while True:
        data = os.read(fd, 4)
        if len(data) < 4:
            continue
        val = struct.unpack("I", data)[0]
        mode = (val >> 24) & 0xFF
        duration = val & 0x00FFFFFF

        if mode == 3:  # timeout = end of signal
            if len(samples) > MIN_SIGNAL_LEN and match_signal(samples):
                now = time.time()
                if now - last_action > 2:  # debounce
                    print(f"power signal detected ({len(samples)} samples)")
                    lights_off()
                    last_action = now
            samples = []
        elif mode == 1:
            samples.append(("p", duration))
        elif mode == 0:
            samples.append(("s", duration))

if __name__ == "__main__":
    main()

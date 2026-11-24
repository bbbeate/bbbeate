# maane-ios

native ios app: point the phone at the sky and see where the moon is + its phase. arkit (`gravityAndHeading`) with camera passthrough, moon/sun math from meeus (low precision, ~0.05°).

- 3d moon lit from the real sun direction, so the phase you see is the real one
- horizon ring, n/ø/s/v labels, sun marker
- arrow at the screen edge when the moon is off-screen
- hud: phase, % lit, altitude/azimuth, next rise/set

## run

open `maane.xcodeproj` in xcode, pick your phone, run. or:

```bash
xcodebuild -project maane.xcodeproj -scheme maane -destination 'id=<device-id>' -allowProvisioningUpdates build
```

needs camera + location permission. compass accuracy is ±5-10°: if the moon looks off, do the figure-8 calibration.

import Foundation

struct Horizontal {
    let azimuth: Double
    let altitude: Double
}

struct MoonState {
    let moon: Horizontal
    let sun: Horizontal
    let illumination: Double
    let age: Double
    let distanceKm: Double

    var waxing: Bool { age < 180 }

    var phaseName: String {
        let names = ["nymåne", "voksende sigd", "første kvarter", "voksende måne",
                     "fullmåne", "minkende måne", "siste kvarter", "minkende sigd"]
        return names[Int((age + 22.5) / 45) % 8]
    }
}

enum Astro {
    static let riseSetAltitude = -0.26

    static func moon(at date: Date, latitude: Double, longitude: Double) -> MoonState {
        let jd = julianDay(date)
        let t = (jd - 2451545) / 36525
        let moonEcl = moonEcliptic(t)
        let sunEcl = sunEcliptic(t)
        let moonEq = equatorial(moonEcl, t: t)
        let sunEq = equatorial(sunEcl, t: t)

        let parallax = deg(asin(6378.14 / moonEcl.distanceKm))
        let moonGeo = horizontal(moonEq, jd: jd, t: t, latitude: latitude, longitude: longitude)
        let moonTopoAlt = moonGeo.altitude - parallax * cos(rad(moonGeo.altitude))
        let moonPos = Horizontal(azimuth: moonGeo.azimuth, altitude: moonTopoAlt + refraction(moonTopoAlt))

        let sunGeo = horizontal(sunEq, jd: jd, t: t, latitude: latitude, longitude: longitude)
        let sunPos = Horizontal(azimuth: sunGeo.azimuth, altitude: sunGeo.altitude + refraction(sunGeo.altitude))

        let elongation = acos(
            sin(rad(sunEq.dec)) * sin(rad(moonEq.dec)) +
            cos(rad(sunEq.dec)) * cos(rad(moonEq.dec)) * cos(rad(sunEq.ra - moonEq.ra))
        )
        let phaseAngle = atan2(sunEcl.distanceKm * sin(elongation),
                               moonEcl.distanceKm - sunEcl.distanceKm * cos(elongation))

        return MoonState(
            moon: moonPos,
            sun: sunPos,
            illumination: (1 + cos(phaseAngle)) / 2,
            age: norm360(moonEcl.lon - sunEcl.lon),
            distanceKm: moonEcl.distanceKm
        )
    }

    static func riseSet(on day: Date, latitude: Double, longitude: Double) -> (rise: Date?, set: Date?) {
        let start = Calendar.current.startOfDay(for: day)
        let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
        let step: TimeInterval = 10 * 60
        var rise: Date?
        var set: Date?
        var time = start
        var previous = moon(at: time, latitude: latitude, longitude: longitude).moon.altitude - riseSetAltitude
        while time < end {
            time = time.addingTimeInterval(step)
            let current = moon(at: time, latitude: latitude, longitude: longitude).moon.altitude - riseSetAltitude
            if previous.sign != current.sign {
                let crossing = time.addingTimeInterval(-step * current / (current - previous))
                if crossing < end {
                    if current > 0, rise == nil { rise = crossing }
                    if current < 0, set == nil { set = crossing }
                }
            }
            previous = current
        }
        return (rise, set)
    }

    static func compassName(_ azimuth: Double) -> String {
        let names = ["n", "nø", "ø", "sø", "s", "sv", "v", "nv"]
        return names[Int((norm360(azimuth) + 22.5) / 45) % 8]
    }

    private struct Ecliptic {
        let lon: Double
        let lat: Double
        let distanceKm: Double
    }

    private struct Equatorial {
        let ra: Double
        let dec: Double
    }

    private static let moonLonTerms: [(Double, Double, Double, Double, Double)] = [
        (6.288774, 0, 0, 1, 0), (1.274027, 2, 0, -1, 0), (0.658314, 2, 0, 0, 0),
        (0.213618, 0, 0, 2, 0), (-0.185116, 0, 1, 0, 0), (-0.114332, 0, 0, 0, 2),
        (0.058793, 2, 0, -2, 0), (0.057066, 2, -1, -1, 0), (0.053322, 2, 0, 1, 0),
        (0.045758, 2, -1, 0, 0), (-0.040923, 0, 1, -1, 0), (-0.034720, 1, 0, 0, 0),
        (-0.030383, 0, 1, 1, 0), (0.015327, 2, 0, 0, -2), (-0.012528, 0, 0, 1, 2),
        (0.010980, 0, 0, 1, -2),
    ]

    private static let moonLatTerms: [(Double, Double, Double, Double, Double)] = [
        (5.128122, 0, 0, 0, 1), (0.280602, 0, 0, 1, 1), (0.277693, 0, 0, 1, -1),
        (0.173237, 2, 0, 0, -1), (0.055413, 2, 0, -1, 1), (0.046271, 2, 0, -1, -1),
        (0.032573, 2, 0, 0, 1), (0.017198, 0, 0, 2, 1),
    ]

    private static let moonDistTerms: [(Double, Double, Double, Double, Double)] = [
        (-20905.355, 0, 0, 1, 0), (-3699.111, 2, 0, -1, 0), (-2955.968, 2, 0, 0, 0),
        (-569.925, 0, 0, 2, 0), (48.888, 0, 1, 0, 0), (-3.149, 0, 0, 0, 2),
        (246.158, 2, 0, -2, 0), (-152.138, 2, -1, -1, 0), (-170.733, 2, 0, 1, 0),
        (-204.586, 2, -1, 0, 0), (-129.620, 0, 1, -1, 0), (108.743, 1, 0, 0, 0),
        (104.755, 0, 1, 1, 0),
    ]

    private static func moonEcliptic(_ t: Double) -> Ecliptic {
        let lp = 218.3164477 + 481267.88123421 * t
        let d = rad(297.8501921 + 445267.1114034 * t)
        let m = rad(357.5291092 + 35999.0502909 * t)
        let mp = rad(134.9633964 + 477198.8675055 * t)
        let f = rad(93.2720950 + 483202.0175233 * t)

        func arg(_ term: (Double, Double, Double, Double, Double)) -> Double {
            term.1 * d + term.2 * m + term.3 * mp + term.4 * f
        }

        let lon = lp + moonLonTerms.reduce(0) { $0 + $1.0 * sin(arg($1)) }
        let lat = moonLatTerms.reduce(0) { $0 + $1.0 * sin(arg($1)) }
        let dist = 385000.56 + moonDistTerms.reduce(0) { $0 + $1.0 * cos(arg($1)) }
        return Ecliptic(lon: norm360(lon), lat: lat, distanceKm: dist)
    }

    private static func sunEcliptic(_ t: Double) -> Ecliptic {
        let l0 = 280.46646 + 36000.76983 * t
        let m = rad(357.52911 + 35999.05029 * t)
        let e = 0.016708634 - 0.000042037 * t
        let c = (1.914602 - 0.004817 * t) * sin(m) + (0.019993 - 0.000101 * t) * sin(2 * m) + 0.000289 * sin(3 * m)
        let trueAnomaly = m + rad(c)
        let au = 1.000001018 * (1 - e * e) / (1 + e * cos(trueAnomaly))
        return Ecliptic(lon: norm360(l0 + c), lat: 0, distanceKm: au * 149_597_870.7)
    }

    private static func equatorial(_ ecl: Ecliptic, t: Double) -> Equatorial {
        let eps = rad(23.439291 - 0.0130042 * t)
        let lon = rad(ecl.lon)
        let lat = rad(ecl.lat)
        let ra = atan2(sin(lon) * cos(eps) - tan(lat) * sin(eps), cos(lon))
        let dec = asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon))
        return Equatorial(ra: norm360(deg(ra)), dec: deg(dec))
    }

    private static func horizontal(_ eq: Equatorial, jd: Double, t: Double, latitude: Double, longitude: Double) -> Horizontal {
        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t
        let h = rad(gmst + longitude - eq.ra)
        let phi = rad(latitude)
        let dec = rad(eq.dec)
        let alt = asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(h))
        let az = atan2(-cos(dec) * sin(h), sin(dec) * cos(phi) - cos(dec) * cos(h) * sin(phi))
        return Horizontal(azimuth: norm360(deg(az)), altitude: deg(alt))
    }

    private static func refraction(_ altitude: Double) -> Double {
        guard altitude > -1 else { return 0 }
        return 1.02 / tan(rad(altitude + 10.3 / (altitude + 5.11))) / 60
    }

    private static func julianDay(_ date: Date) -> Double {
        date.timeIntervalSince1970 / 86400 + 2440587.5
    }
}

func rad(_ degrees: Double) -> Double { degrees * .pi / 180 }
func deg(_ radians: Double) -> Double { radians * 180 / .pi }
func norm360(_ degrees: Double) -> Double {
    let m = degrees.truncatingRemainder(dividingBy: 360)
    return m < 0 ? m + 360 : m
}

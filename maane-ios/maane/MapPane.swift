import MapKit
import SwiftUI

struct MapPane: View {
    let coordinate: CLLocationCoordinate2D
    let moonAzimuth: Double

    var body: some View {
        Map(initialPosition: .region(MKCoordinateRegion(center: coordinate, latitudinalMeters: 6000, longitudinalMeters: 6000))) {
            MapPolyline(coordinates: [coordinate, destination(meters: 2500)])
                .stroke(.white, style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: [6, 6]))
            Annotation("", coordinate: coordinate) {
                Circle()
                    .fill(.white)
                    .frame(width: 14, height: 14)
            }
        }
        .mapStyle(.standard(emphasis: .muted, pointsOfInterest: .excludingAll))
        .mapControlVisibility(.hidden)
        .saturation(0)
        .colorMultiply(Theme.first)
    }

    private func destination(meters: Double) -> CLLocationCoordinate2D {
        let metersPerDegree = 111_320.0
        let az = rad(moonAzimuth)
        return CLLocationCoordinate2D(
            latitude: coordinate.latitude + meters * cos(az) / metersPerDegree,
            longitude: coordinate.longitude + meters * sin(az) / (metersPerDegree * cos(rad(coordinate.latitude)))
        )
    }
}

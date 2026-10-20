import ARKit
import CoreMotion
import SceneKit
import SwiftUI

final class SkyModel: ObservableObject {
    @Published var moonOnScreen = true
    @Published var arrowAngle: Double = 0
    @Published var headingOffset = 0
}

struct SkyView: UIViewRepresentable {
    let state: MoonState?
    let showCamera: Bool
    @ObservedObject var model: SkyModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> ARSCNView {
        let view = ARSCNView()
        view.delegate = context.coordinator
        view.scene = context.coordinator.scene
        view.autoenablesDefaultLighting = false
        view.automaticallyUpdatesLighting = false
        context.coordinator.view = view

        let config = ARWorldTrackingConfiguration()
        config.worldAlignment = .gravityAndHeading
        view.session.run(config)
        return view
    }

    func updateUIView(_ view: ARSCNView, context: Context) {
        context.coordinator.update(state, showCamera: showCamera)
    }

    static func dismantleUIView(_ view: ARSCNView, coordinator: Coordinator) {
        view.session.pause()
        coordinator.motion.stopDeviceMotionUpdates()
    }

    final class Coordinator: NSObject, ARSCNViewDelegate {
        static let skyRadius: Float = 50
        static let moonCategory = 2
        static let headingSmoothing: Float = 0.02
        static let maxRotationRate = 0.6
        static let maxCameraTilt: Float = 0.9

        let scene = SCNScene()
        let motion = CMMotionManager()
        weak var view: ARSCNView?

        private let model: SkyModel
        private let sky = SCNNode()
        private let moon = SCNNode()
        private let sun = SCNNode()
        private let sunLight = SCNNode()
        private let dome = SCNNode()
        private var headingCorrection: SIMD2<Float>?

        init(model: SkyModel) {
            self.model = model
            super.init()
            scene.rootNode.addChildNode(sky)
            buildMoon()
            buildSun()
            buildHorizon()
            buildCardinals()
            buildDome()
            startMotion()
        }

        func update(_ state: MoonState?, showCamera: Bool) {
            dome.isHidden = showCamera
            guard let state else {
                sky.isHidden = true
                return
            }
            sky.isHidden = false
            moon.simdPosition = Self.direction(state.moon) * Self.skyRadius
            sun.simdPosition = Self.direction(state.sun) * Self.skyRadius
            sunLight.simdOrientation = simd_quatf(from: [0, 0, -1], to: -Self.direction(state.sun))
        }

        func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
            guard let camera = renderer.pointOfView else { return }
            sky.simdPosition = camera.simdWorldPosition
            correctHeading(cameraFront: camera.simdWorldFront)
            let local = camera.simdConvertPosition(moon.simdWorldPosition, from: nil)
            let projected = renderer.projectPoint(moon.worldPosition)

            DispatchQueue.main.async { [weak self] in
                guard let self, let bounds = self.view?.bounds else { return }
                let onScreen = local.z < 0 && bounds.contains(CGPoint(x: CGFloat(projected.x), y: CGFloat(projected.y)))
                let angle = Double(atan2(-local.y, local.x))
                if self.model.moonOnScreen != onScreen { self.model.moonOnScreen = onScreen }
                if !onScreen, abs(self.model.arrowAngle - angle) > 0.02 { self.model.arrowAngle = angle }
            }
        }

        private func startMotion() {
            guard CMMotionManager.availableAttitudeReferenceFrames().contains(.xTrueNorthZVertical) else { return }
            motion.deviceMotionUpdateInterval = 1.0 / 60
            motion.showsDeviceMovementDisplay = true
            motion.startDeviceMotionUpdates(using: .xTrueNorthZVertical)
        }

        private func correctHeading(cameraFront: SIMD3<Float>) {
            guard let deviceMotion = motion.deviceMotion,
                  deviceMotion.magneticField.accuracy != .uncalibrated,
                  abs(cameraFront.y) < Self.maxCameraTilt else { return }
            let rate = deviceMotion.rotationRate
            guard (rate.x * rate.x + rate.y * rate.y + rate.z * rate.z).squareRoot() < Self.maxRotationRate else { return }

            let r = deviceMotion.attitude.rotationMatrix
            let trueAzimuth = Float(atan2(r.m32, -r.m31))
            let arAzimuth = atan2(cameraFront.x, -cameraFront.z)
            let sample = SIMD2(cos(trueAzimuth - arAzimuth), sin(trueAzimuth - arAzimuth))

            let blended = headingCorrection.map { $0 + (sample - $0) * Self.headingSmoothing } ?? sample
            let correction = simd_normalize(blended)
            headingCorrection = correction

            let angle = atan2(correction.y, correction.x)
            sky.simdOrientation = simd_quatf(angle: angle, axis: [0, 1, 0])

            let degrees = Int(deg(Double(angle)).rounded())
            DispatchQueue.main.async { [weak self] in
                guard let self, self.model.headingOffset != degrees else { return }
                self.model.headingOffset = degrees
            }
        }

        static func direction(_ position: Horizontal) -> SIMD3<Float> {
            let az = Float(rad(position.azimuth))
            let alt = Float(rad(position.altitude))
            return [cos(alt) * sin(az), sin(alt), -cos(alt) * cos(az)]
        }

        private func buildMoon() {
            let sphere = SCNSphere(radius: 1.75)
            sphere.segmentCount = 64
            let material = SCNMaterial()
            material.lightingModel = .lambert
            material.diffuse.contents = UIColor(white: 0.92, alpha: 1)
            material.emission.contents = UIColor(white: 0.05, alpha: 1)
            sphere.firstMaterial = material
            moon.geometry = sphere
            moon.categoryBitMask = Self.moonCategory
            sky.addChildNode(moon)

            let light = SCNLight()
            light.type = .directional
            light.intensity = 1200
            light.categoryBitMask = Self.moonCategory
            sunLight.light = light
            sky.addChildNode(sunLight)
        }

        private func buildSun() {
            let sphere = SCNSphere(radius: 1.2)
            let material = SCNMaterial()
            material.lightingModel = .constant
            material.diffuse.contents = UIColor(red: 1, green: 0.82, blue: 0.48, alpha: 1)
            sphere.firstMaterial = material
            sun.geometry = sphere
            sky.addChildNode(sun)
        }

        private func buildHorizon() {
            let ring = SCNTorus(ringRadius: CGFloat(Self.skyRadius), pipeRadius: 0.04)
            ring.ringSegmentCount = 180
            let material = SCNMaterial()
            material.lightingModel = .constant
            material.diffuse.contents = UIColor(named: "first")?.withAlphaComponent(0.5)
            ring.firstMaterial = material
            sky.addChildNode(SCNNode(geometry: ring))
        }

        private func buildDome() {
            let sphere = SCNSphere(radius: CGFloat(Self.skyRadius) * 1.6)
            let material = SCNMaterial()
            material.lightingModel = .constant
            material.diffuse.contents = UIColor(named: "background")
            material.cullMode = .front
            sphere.firstMaterial = material
            dome.geometry = sphere
            sky.addChildNode(dome)
        }

        private func buildCardinals() {
            for (label, azimuth) in [("N", 0.0), ("Ø", 90.0), ("S", 180.0), ("V", 270.0)] {
                let text = SCNText(string: label, extrusionDepth: 0)
                text.font = UIFont.systemFont(ofSize: 2, weight: .light)
                text.flatness = 0.05
                let material = SCNMaterial()
                material.lightingModel = .constant
                material.diffuse.contents = UIColor(named: "first")
                text.firstMaterial = material

                let node = SCNNode(geometry: text)
                let (min, max) = text.boundingBox
                node.pivot = SCNMatrix4MakeTranslation((min.x + max.x) / 2, min.y, 0)
                node.simdPosition = Self.direction(Horizontal(azimuth: azimuth, altitude: 1)) * (Self.skyRadius - 1)
                node.constraints = [SCNBillboardConstraint()]
                sky.addChildNode(node)
            }
        }
    }
}

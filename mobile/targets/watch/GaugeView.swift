import SwiftUI

/// Dial de afinación, el mismo de la app del teléfono en chico: el indicador
/// viaja sobre el arco y la nota queda siempre legible en el centro. La zona
/// verde son los ±5 cents que el oído no distingue.
struct GaugeView: View {
    /// Desvío en cents, o nil si no hay nota.
    let cents: Double?
    let verdict: TuningVerdict?
    let note: String
    let detail: String
    var range: Double = 50

    private let sweep: Double = 68

    private var angle: Double {
        guard let cents else { return 0 }
        return (max(-range, min(range, cents)) / range) * sweep
    }

    private var color: Color {
        switch verdict {
        case .inTune: return Palette.inTune
        case .low, .high: return Palette.outOfTune
        case nil: return Palette.soft
        }
    }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let radius = w * 0.44
            let ring = max(7, w * 0.055)
            let center = CGPoint(x: w / 2, y: geo.size.height - 4)

            ZStack {
                Canvas { context, _ in
                    // Arco base y zona afinada
                    context.stroke(arc(center: center, radius: radius, from: -sweep, to: sweep), with: .color(Palette.track), style: StrokeStyle(lineWidth: ring, lineCap: .round))
                    let green = (inTuneCents / range) * sweep
                    context.stroke(arc(center: center, radius: radius, from: -green, to: green), with: .color(verdict == .inTune ? Palette.inTune : Palette.inTune.opacity(0.35)), style: StrokeStyle(lineWidth: ring, lineCap: .round))

                    // Marcas cada 10 cents
                    for tick in stride(from: -50, through: 50, by: 10) where abs(Double(tick)) <= range {
                        let degrees = (Double(tick) / range) * sweep
                        let major = tick % 20 == 0
                        let p1 = point(center: center, radius: radius - ring / 2 - 2, degrees: degrees)
                        let p2 = point(center: center, radius: radius - ring / 2 - (major ? 9 : 5), degrees: degrees)
                        var line = Path()
                        line.move(to: p1)
                        line.addLine(to: p2)
                        context.stroke(line, with: .color(tick == 0 ? Palette.ink : Palette.soft), lineWidth: tick == 0 ? 2 : 1)
                    }
                }

                // Indicador: se rota alrededor del centro del arco
                IndicatorShape(center: center, radius: radius, ring: ring)
                    .fill(color)
                    .opacity(cents == nil ? 0.25 : 1)
                    .rotationEffect(.degrees(angle), anchor: UnitPoint(x: 0.5, y: center.y / max(geo.size.height, 1)))
                    .animation(.linear(duration: 0.09), value: angle)

                VStack(spacing: 0) {
                    Text(note)
                        .font(.system(size: note.count > 2 ? w * 0.19 : w * 0.22, weight: .bold, design: .rounded))
                        .foregroundStyle(cents == nil ? Palette.soft : Palette.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    Text(detail)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(Palette.muted)
                        .lineLimit(1)
                }
                .position(x: w / 2, y: center.y - radius * 0.28)
            }
        }
        .aspectRatio(340.0 / 200.0, contentMode: .fit)
        .accessibilityLabel(cents == nil ? "Sin señal" : "\(note), \(Int(cents!.rounded())) cents")
    }

    private func point(center: CGPoint, radius: CGFloat, degrees: Double) -> CGPoint {
        let rad = (degrees - 90) * .pi / 180
        return CGPoint(x: center.x + radius * cos(rad), y: center.y + radius * sin(rad))
    }

    private func arc(center: CGPoint, radius: CGFloat, from: Double, to: Double) -> Path {
        var path = Path()
        path.addArc(center: center, radius: radius, startAngle: .degrees(from - 90), endAngle: .degrees(to - 90), clockwise: false)
        return path
    }
}

/// Segmento grueso sobre el arco más un triángulo que apunta al centro.
private struct IndicatorShape: Shape {
    let center: CGPoint
    let radius: CGFloat
    let ring: CGFloat

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let half: Double = 2.6
        path.addArc(center: center, radius: radius + ring / 2 + 2, startAngle: .degrees(-90 - half), endAngle: .degrees(-90 + half), clockwise: false)
        path.addArc(center: center, radius: radius - ring / 2 - 2, startAngle: .degrees(-90 + half), endAngle: .degrees(-90 - half), clockwise: true)
        path.closeSubpath()
        let tipY = center.y - radius + ring / 2 + 8
        path.move(to: CGPoint(x: center.x, y: tipY))
        path.addLine(to: CGPoint(x: center.x - 5, y: tipY + 9))
        path.addLine(to: CGPoint(x: center.x + 5, y: tipY + 9))
        path.closeSubpath()
        return path
    }
}

/// La paleta de la app, adaptada a la pantalla negra del reloj.
enum Palette {
    static let ink = Color.white
    static let muted = Color(white: 0.7)
    static let soft = Color(white: 0.45)
    static let track = Color(white: 0.22)
    static let inTune = Color(red: 0.06, green: 0.73, blue: 0.51)
    static let outOfTune = Color(red: 0.98, green: 0.62, blue: 0.11)
    static let accent = Color.accentColor
}

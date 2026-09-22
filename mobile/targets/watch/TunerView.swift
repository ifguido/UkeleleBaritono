import SwiftUI

struct TunerView: View {
    @StateObject private var model = TunerModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                GaugeView(
                    cents: model.reading?.cents,
                    verdict: model.reading?.verdict,
                    note: model.reading?.note ?? "—",
                    detail: detailText
                )

                Text(instruction)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(instructionColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(maxWidth: .infinity)

                // Centrado y más angosto que la pantalla: en el reloj los
                // bordes son curvos y un botón de ancho completo parece corrido.
                Button(action: model.toggle) {
                    Label(model.starting ? "Permiso…" : model.listening ? "Detener" : "Afinar", systemImage: model.listening ? "stop.fill" : "mic.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(model.listening ? Palette.outOfTune : Palette.accent)
                .disabled(model.starting)
                .frame(maxWidth: 150)
                .frame(maxWidth: .infinity, alignment: .center)

                if let error = model.error {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(Palette.outOfTune)
                        .multilineTextAlignment(.center)
                }

                strings

                HStack(spacing: 6) {
                    ForEach(TunerMode.allCases) { mode in
                        Button(mode.label) { model.mode = mode }
                            .buttonStyle(.bordered)
                            .tint(model.mode == mode ? Palette.accent : Palette.soft)
                            .font(.system(size: 12, weight: .semibold))
                    }
                }
                .padding(.top, 2)

                if model.allDone {
                    Text("Las cuatro afinadas. Repasalas: al tensar una se mueven las demás.")
                        .font(.footnote)
                        .foregroundStyle(Palette.inTune)
                        .multilineTextAlignment(.center)
                }
                if !model.done.isEmpty {
                    Button("Reiniciar cuerdas", action: model.resetDone)
                        .font(.footnote)
                        .buttonStyle(.plain)
                        .foregroundStyle(Palette.muted)
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Afinador")
        // Al pasar a segundo plano se apaga el micrófono: nadie mira la
        // pantalla y el sistema igual corta la captura.
        .onChange(of: scenePhase) { _, phase in
            if phase != .active, model.listening { model.stop() }
        }
    }

    private var strings: some View {
        HStack(spacing: 5) {
            ForEach(model.targets) { target in
                let active = model.reading?.target?.index == target.index
                let isDone = model.done.contains(target.index)
                let isPinned = model.pinned == target.index
                Button {
                    model.pinned = isPinned ? nil : target.index
                } label: {
                    VStack(spacing: 1) {
                        HStack(spacing: 2) {
                            Text(target.label).font(.system(size: 16, weight: .bold, design: .rounded))
                            if isDone { Image(systemName: "checkmark").font(.system(size: 9, weight: .bold)) }
                        }
                        Text(active ? centsText(model.reading!.cents) : target.fullName)
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(active ? Palette.ink : Palette.muted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 5)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(active ? (model.reading!.verdict == .inTune ? Palette.inTune.opacity(0.35) : Palette.outOfTune.opacity(0.3)) : isDone ? Palette.inTune.opacity(0.15) : Color(white: 0.14))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isPinned ? Palette.accent : Color.clear, lineWidth: 1.5)
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(target.fullName)\(isPinned ? ", fijada" : "")\(isDone ? ", afinada" : "")")
            }
        }
    }

    private var detailText: String {
        if let r = model.reading {
            let sign = r.cents > 0 ? "+" : ""
            return String(format: "%.1f Hz · %@%.0f¢", r.frequency, sign, r.cents)
        }
        return model.listening ? "esperando una cuerda" : "micrófono apagado"
    }

    private var instruction: String {
        if let r = model.reading {
            let text = instructionFor(r.verdict, cents: r.cents)
            switch r.verdict {
            case .low: return "◀ " + text
            case .high: return text + " ▶"
            case .inTune: return text
            }
        }
        return model.listening ? "Tocá una cuerda" : " "
    }

    private var instructionColor: Color {
        guard let r = model.reading else { return Palette.soft }
        return r.verdict == .inTune ? Palette.inTune : Palette.outOfTune
    }

    private func centsText(_ cents: Double) -> String {
        String(format: "%@%.0f", cents > 0 ? "+" : "", cents)
    }
}

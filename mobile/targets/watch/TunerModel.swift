import Foundation
import SwiftUI
import WatchKit

/// Lo que se muestra en el dial en un instante dado.
struct Reading: Equatable {
    let frequency: Double
    /// Cuerda contra la que se compara (nil en cromático o sin coincidencia).
    let target: StringTarget?
    let cents: Double
    let verdict: TuningVerdict
    /// Nombre a mostrar en grande.
    let note: String
}

enum TunerMode: String, CaseIterable, Identifiable {
    case strings, chromatic
    var id: String { rawValue }
    var label: String { self == .strings ? "Cuerdas" : "Cromático" }
}

/// Estado del afinador. Es el mismo bucle que `afinador/index.tsx` del
/// teléfono: análisis cada 40 ms, mediana corta, y una cuerda se da por
/// lista recién cuando se sostuvo afinada 0,7 s.
@MainActor
final class TunerModel: ObservableObject {
    @Published var listening = false
    @Published var starting = false
    @Published var error: String?
    @Published var reading: Reading?
    @Published var level: Double = 0
    @Published var mode: TunerMode = .strings
    @Published var pinned: Int?
    @Published var done: Set<Int> = []

    let targets = stringTargets()

    private let input = AudioInput(windowSize: 4096)
    private let tracker = PitchTracker()
    private var timer: Timer?
    private var inTuneSince: (index: Int, at: Date)?

    private static let holdSeconds: TimeInterval = 0.7
    /// Debajo de esta claridad, lo que entra por el micrófono no es una cuerda.
    private static let minClarity = 0.82
    private static let analysisInterval: TimeInterval = 0.04

    var allDone: Bool { targets.allSatisfy { done.contains($0.index) } }

    func toggle() {
        if listening { stop() } else { Task { await start() } }
    }

    func start() async {
        error = nil
        starting = true
        defer { starting = false }
        do {
            try await input.start()
        } catch AudioInput.Failure.denied {
            error = "Sin permiso de micrófono. Activalo en Ajustes › Privacidad › Micrófono."
            return
        } catch AudioInput.Failure.unavailable(let message) {
            error = "No pude abrir el micrófono: \(message)"
            return
        } catch let failure {
            error = "No pude abrir el micrófono: \(failure.localizedDescription)"
            return
        }
        tracker.reset()
        listening = true
        timer = Timer.scheduledTimer(withTimeInterval: Self.analysisInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.analyze() }
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        input.stop()
        tracker.reset()
        inTuneSince = nil
        listening = false
        reading = nil
        level = 0
    }

    func resetDone() {
        done.removeAll()
    }

    private func analyze() {
        guard listening else { return }
        let result = detectPitch(input.read(), sampleRate: input.sampleRate)
        level = result.level

        let usable = result.clarity >= Self.minClarity ? result.frequency : nil
        guard let frequency = tracker.push(usable) else {
            reading = nil
            inTuneSince = nil
            return
        }

        let next: Reading
        if mode == .chromatic {
            let note = readNote(frequency)
            next = Reading(frequency: frequency, target: nil, cents: note.cents, verdict: verdictFor(note.cents), note: note.fullName)
        } else if let target = pinned.map({ targets[$0] }) ?? nearestString(frequency, targets: targets)?.target {
            let cents = centsBetween(frequency, target.frequency)
            next = Reading(frequency: frequency, target: target, cents: cents, verdict: verdictFor(cents), note: target.fullName)
        } else {
            // Suena algo que no es ninguna de las cuatro cuerdas: se dice qué
            // es en vez de mandar a girar la clavija equivocada.
            let note = readNote(frequency)
            next = Reading(frequency: frequency, target: nil, cents: note.cents, verdict: verdictFor(note.cents), note: note.fullName)
        }
        reading = next

        if let target = next.target, abs(next.cents) <= inTuneCents {
            let now = Date()
            if let held = inTuneSince, held.index == target.index {
                if now.timeIntervalSince(held.at) >= Self.holdSeconds, !done.contains(target.index) {
                    done.insert(target.index)
                    WKInterfaceDevice.current().play(.success)
                }
            } else {
                inTuneSince = (target.index, now)
            }
        } else {
            inTuneSince = nil
        }
    }
}

import Foundation

/// De frecuencia a nota y viceversa. Traducción de `src/lib/engine/tuning.ts`
/// y de lo mínimo de `notes.ts` que el afinador necesita.

let defaultA4: Double = 440
/// Tolerancia estándar de un afinador: ±5 cents no se distingue de oído.
let inTuneCents: Double = 5

private let pcNamesSharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

func midiToFrequency(_ midi: Int, a4: Double = defaultA4) -> Double {
    a4 * pow(2, Double(midi - 69) / 12)
}

func frequencyToMidiFloat(_ frequency: Double, a4: Double = defaultA4) -> Double {
    69 + 12 * log2(frequency / a4)
}

/// Diferencia en cents entre dos frecuencias (positivo = la primera es más aguda).
func centsBetween(_ frequency: Double, _ reference: Double) -> Double {
    1200 * log2(frequency / reference)
}

struct NoteReading {
    let frequency: Double
    let midi: Int
    let noteName: String
    let octave: Int
    /// "A3", "C#4".
    let fullName: String
    /// Desvío respecto de esa nota, entre −50 y +50.
    let cents: Double
}

func readNote(_ frequency: Double, a4: Double = defaultA4) -> NoteReading {
    let exact = frequencyToMidiFloat(frequency, a4: a4)
    let midi = Int(exact.rounded())
    let pc = ((midi % 12) + 12) % 12
    let octave = Int(floor(Double(midi) / 12)) - 1
    return NoteReading(
        frequency: frequency,
        midi: midi,
        noteName: pcNamesSharp[pc],
        octave: octave,
        fullName: "\(pcNamesSharp[pc])\(octave)",
        cents: (exact - Double(midi)) * 100
    )
}

struct StringTarget: Identifiable, Equatable {
    /// Índice de cuerda, 0 = la más grave.
    let index: Int
    let midi: Int
    /// "D", "G", "B", "E".
    let label: String
    /// "D3", "G3"…
    let fullName: String
    let frequency: Double
    var id: Int { index }
}

/// Ukelele barítono estándar: D3–G3–B3–E4 (grave → agudo).
let baritoneStrings: [(midi: Int, label: String)] = [(50, "D"), (55, "G"), (59, "B"), (64, "E")]

func stringTargets(a4: Double = defaultA4) -> [StringTarget] {
    baritoneStrings.enumerated().map { index, s in
        let pc = ((s.midi % 12) + 12) % 12
        let octave = Int(floor(Double(s.midi) / 12)) - 1
        return StringTarget(
            index: index,
            midi: s.midi,
            label: s.label,
            fullName: "\(pcNamesSharp[pc])\(octave)",
            frequency: midiToFrequency(s.midi, a4: a4)
        )
    }
}

struct StringMatch {
    let target: StringTarget
    let cents: Double
}

/// Qué cuerda estás tocando: la más cercana en cents, solo si está dentro de
/// `maxCents`. Más lejos no es "esa cuerda desafinada", es otra nota.
func nearestString(_ frequency: Double, targets: [StringTarget], maxCents: Double = 350) -> StringMatch? {
    var best: StringMatch?
    for target in targets {
        let cents = centsBetween(frequency, target.frequency)
        if best == nil || abs(cents) < abs(best!.cents) { best = StringMatch(target: target, cents: cents) }
    }
    guard let match = best, abs(match.cents) <= maxCents else { return nil }
    return match
}

enum TuningVerdict {
    case inTune, low, high
}

func verdictFor(_ cents: Double, tolerance: Double = inTuneCents) -> TuningVerdict {
    if abs(cents) <= tolerance { return .inTune }
    return cents < 0 ? .low : .high
}

/// Qué hacer con la clavija. Si el desvío se sale del dial, avisa que hay que
/// girar bastante, no un toque.
func instructionFor(_ verdict: TuningVerdict, cents: Double = 0) -> String {
    let far = abs(cents) > 50
    switch verdict {
    case .inTune: return "Afinada"
    case .low: return far ? "Tensá bastante" : "Tensá la cuerda"
    case .high: return far ? "Aflojá bastante" : "Aflojá la cuerda"
    }
}

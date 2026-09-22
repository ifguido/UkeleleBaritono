import Foundation

/// Detección de altura por YIN (de Cheveigné & Kawahara, 2002).
///
/// Traducción fiel de `src/lib/audio/pitch.ts`: mismos umbrales, misma
/// normalización acumulada y misma interpolación parabólica. Si se cambia
/// algo allá, se cambia acá.
struct PitchResult {
    /// Frecuencia fundamental en Hz, o nil si no hay un tono claro.
    let frequency: Double?
    /// 0–1: qué tan periódica es la señal. Por debajo de ~0.8 no es una nota.
    let clarity: Double
    /// Nivel RMS de la señal (0–1).
    let level: Double

    static let silence = PitchResult(frequency: nil, clarity: 0, level: 0)
}

struct PitchOptions {
    var minFrequency: Double = 60
    var maxFrequency: Double = 1200
    /// Umbral de YIN: el primer mínimo por debajo de este valor gana.
    var threshold: Float = 0.15
    /// RMS mínimo para molestarse en analizar.
    var minLevel: Double = 0.008
}

/// Cuando ningún mínimo baja del umbral, se acepta el mejor si al menos llega acá.
private let fallbackLimit: Float = 0.55

func detectPitch(_ buffer: [Float], sampleRate: Double, options: PitchOptions = PitchOptions()) -> PitchResult {
    let n = buffer.count
    guard n > 4 else { return .silence }

    // Nivel sin la componente continua.
    var mean: Float = 0
    for x in buffer { mean += x }
    mean /= Float(n)
    var sumSquares: Double = 0
    for x in buffer {
        let v = Double(x - mean)
        sumSquares += v * v
    }
    let level = (sumSquares / Double(n)).squareRoot()
    if level < options.minLevel { return PitchResult(frequency: nil, clarity: 0, level: level) }

    let window = n >> 1
    let tauMin = max(2, Int(floor(sampleRate / options.maxFrequency)))
    let tauMax = min(window - 1, Int(ceil(sampleRate / options.minFrequency)))
    if tauMax <= tauMin { return PitchResult(frequency: nil, clarity: 0, level: level) }

    // 1) Función de diferencia
    var yin = [Float](repeating: 0, count: tauMax + 1)
    buffer.withUnsafeBufferPointer { p in
        for tau in 1...tauMax {
            var sum: Float = 0
            var i = 0
            while i < window {
                let delta = p[i] - p[i + tau]
                sum += delta * delta
                i += 1
            }
            yin[tau] = sum
        }
    }

    // 2) Diferencia media acumulada normalizada
    yin[0] = 1
    var running: Float = 0
    for tau in 1...tauMax {
        running += yin[tau]
        yin[tau] = running == 0 ? 1 : (yin[tau] * Float(tau)) / running
    }

    // 3) Primer mínimo por debajo del umbral (no el mínimo global)
    var bestTau = -1
    var tau = tauMin
    while tau <= tauMax {
        if yin[tau] < options.threshold {
            while tau + 1 <= tauMax && yin[tau + 1] < yin[tau] { tau += 1 }
            bestTau = tau
            break
        }
        tau += 1
    }
    if bestTau < 0 {
        var minValue = Float.infinity
        for t in tauMin...tauMax where yin[t] < minValue {
            minValue = yin[t]
            bestTau = t
        }
        if bestTau < 0 || minValue > fallbackLimit {
            return PitchResult(frequency: nil, clarity: 0, level: level)
        }
    }

    // 4) Interpolación parabólica alrededor del mínimo
    var refined = Double(bestTau)
    if bestTau > tauMin && bestTau < tauMax {
        let s0 = Double(yin[bestTau - 1])
        let s1 = Double(yin[bestTau])
        let s2 = Double(yin[bestTau + 1])
        let denominator = 2 * (2 * s1 - s2 - s0)
        if denominator != 0 {
            let shift = (s2 - s0) / denominator
            if abs(shift) < 1 { refined = Double(bestTau) + shift }
        }
    }

    let frequency = sampleRate / refined
    if frequency < options.minFrequency || frequency > options.maxFrequency {
        return PitchResult(frequency: nil, clarity: 0, level: level)
    }
    let clarity = max(0, min(1, 1 - Double(yin[bestTau])))
    return PitchResult(frequency: frequency, clarity: clarity, level: level)
}

/// Mediana de una lista de frecuencias.
func medianFrequency(_ values: [Double]) -> Double? {
    if values.isEmpty { return nil }
    let sorted = values.sorted()
    let middle = sorted.count >> 1
    return sorted.count % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/// Historial corto de frecuencias con salida estable: devuelve un valor solo
/// cuando las lecturas coinciden entre sí (descarta los saltos de octava del
/// ataque de la cuerda).
final class PitchTracker {
    private var history: [Double] = []
    private let size: Int
    private let toleranceCents: Double

    init(size: Int = 5, toleranceCents: Double = 45) {
        self.size = size
        self.toleranceCents = toleranceCents
    }

    func push(_ frequency: Double?) -> Double? {
        guard let frequency else {
            history.removeAll()
            return nil
        }
        history.append(frequency)
        if history.count > size { history.removeFirst() }
        if history.count < min(3, size) { return nil }

        let median = medianFrequency(history)!
        let agree = history.filter { abs(1200 * log2($0 / median)) < toleranceCents }
        if agree.count < Int(ceil(Double(history.count) / 2)) { return nil }
        return medianFrequency(agree)
    }

    func reset() {
        history.removeAll()
    }
}

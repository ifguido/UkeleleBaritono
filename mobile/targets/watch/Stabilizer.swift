import Foundation

/// Lo que convierte lecturas crudas en una aguja que se puede mirar.
///
/// Traducción fiel de `src/lib/audio/stabilizer.ts`: suaviza el temblor,
/// salta directo cuando cambia la nota, sostiene la última lectura mientras
/// la cuerda se apaga y no deja que las lecturas hundidas en el ruido de
/// fondo muevan la aguja. Si se cambia algo allá, se cambia acá.
struct StabilizerOptions {
    /// Si la señal se corta menos que esto, la historia de lecturas se conserva.
    var gap: TimeInterval = 0.25
    /// Cuánto se sostiene la última lectura después de que la cuerda se calla.
    var hold: TimeInterval = 1.5
    /// Sin lecturas nuevas por más de esto, la lectura se marca como sostenida.
    var fresh: TimeInterval = 0.15
    /// Constante de tiempo del suavizado con la aguja casi quieta.
    var slow: TimeInterval = 0.22
    /// Constante de tiempo con desvíos grandes (clavija girando).
    var fast: TimeInterval = 0.09
    /// Desvío, en cents, a partir del cual se usa la constante rápida.
    var fastAboveCents: Double = 8
    /// Desvío, en cents, que se toma como nota nueva: la aguja salta.
    var jumpCents: Double = 70
    /// Relación señal/ruido mínima (en amplitud) para que una lectura mueva la aguja.
    var minSnr: Double = 10
    /// Cuánto puede subir por segundo la estimación del ruido de fondo.
    var floorRisePerSecond: Double = 1.15
}

/// Arranque y límites del ruido de fondo (RMS).
private let initialFloor = 0.001
private let minFloor = 0.00005
private let maxFloor = 0.004
/// Constante de tiempo con la que se aprende el ruido en los cuadros sin nota.
private let floorLearn: TimeInterval = 0.3

struct StableReading {
    let frequency: Double
    /// false si es la última lectura que hubo y se está sosteniendo.
    let fresh: Bool
}

final class TunerStabilizer {
    private let options: StabilizerOptions
    private let tracker = PitchTracker()
    private var smoothed: Double?
    private var lastSignalAt = -Double.infinity
    private var lastUpdateAt = -Double.infinity
    private var floor = initialFloor
    private var lastFrameAt: TimeInterval?

    init(options: StabilizerOptions = StabilizerOptions()) {
        self.options = options
    }

    /// Un cuadro de análisis; `now` en segundos y `level` el RMS del cuadro.
    func push(_ frequency: Double?, now: TimeInterval, level: Double? = nil) -> StableReading? {
        let weak = level.map { isWeak($0, pitched: frequency != nil, now: now) } ?? false
        if let frequency {
            lastSignalAt = now
            // Una lectura débil mantiene viva la nota pero no mueve la aguja.
            if !weak, let candidate = tracker.push(frequency) { follow(candidate, now: now) }
        } else if now - lastSignalAt > options.gap {
            tracker.reset()
        }

        guard let smoothed else { return nil }
        let age = now - lastUpdateAt
        if age > options.hold {
            self.smoothed = nil
            return nil
        }
        return StableReading(frequency: smoothed, fresh: age <= options.fresh)
    }

    func reset() {
        tracker.reset()
        smoothed = nil
        lastSignalAt = -.infinity
        lastUpdateAt = -.infinity
        floor = initialFloor
        lastFrameAt = nil
    }

    /// Actualiza el ruido de fondo y dice si este cuadro está demasiado cerca.
    private func isWeak(_ level: Double, pitched: Bool, now: TimeInterval) -> Bool {
        let elapsed = lastFrameAt.map { max(0, now - $0) } ?? 0
        lastFrameAt = now
        if level < floor {
            floor = level
        } else if !pitched && level < floor * options.minSnr {
            floor += (level - floor) * (1 - exp(-elapsed / floorLearn))
        } else {
            floor *= pow(options.floorRisePerSecond, elapsed)
        }
        floor = min(max(floor, minFloor), maxFloor)
        return level < floor * options.minSnr
    }

    private func follow(_ candidate: Double, now: TimeInterval) {
        let elapsed = now - lastUpdateAt
        lastUpdateAt = now
        guard let previous = smoothed, elapsed <= options.hold else {
            smoothed = candidate
            return
        }
        let cents = 1200 * log2(candidate / previous)
        if abs(cents) > options.jumpCents {
            smoothed = candidate
            return
        }
        let tau = abs(cents) > options.fastAboveCents ? options.fast : options.slow
        let alpha = 1 - exp(-min(elapsed, 0.25) / tau)
        smoothed = previous * pow(2, alpha * cents / 1200)
    }
}

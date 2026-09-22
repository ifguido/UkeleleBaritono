import AVFoundation
import Foundation

/// Micrófono del reloj para el afinador.
///
/// Igual que en el teléfono: sesión en modo `measurement` (sin cancelación de
/// eco ni control automático de ganancia, que le comen los armónicos a la
/// cuerda) y un buffer circular con la última ventana de muestras, que el
/// bucle de análisis lee 25 veces por segundo.
final class AudioInput {
    enum Failure: Error {
        case denied
        case unavailable(String)
    }

    let windowSize: Int
    private(set) var sampleRate: Double = 48000

    private let engine = AVAudioEngine()
    private var ring: [Float]
    private var writePos = 0
    private let lock = NSLock()
    private var running = false

    init(windowSize: Int = 4096) {
        self.windowSize = windowSize
        ring = [Float](repeating: 0, count: windowSize)
    }

    static func requestPermission() async -> Bool {
        if #available(watchOS 10.0, *) {
            return await AVAudioApplication.requestRecordPermission()
        } else {
            return await withCheckedContinuation { continuation in
                AVAudioSession.sharedInstance().requestRecordPermission { continuation.resume(returning: $0) }
            }
        }
    }

    func start() async throws {
        if running { return }
        guard await AudioInput.requestPermission() else { throw Failure.denied }

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .measurement, options: [])
            try session.setActive(true)
        } catch {
            throw Failure.unavailable(error.localizedDescription)
        }

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else {
            throw Failure.unavailable("El micrófono no está disponible.")
        }
        sampleRate = format.sampleRate

        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.append(buffer)
        }
        engine.prepare()
        do {
            try engine.start()
        } catch {
            input.removeTap(onBus: 0)
            throw Failure.unavailable(error.localizedDescription)
        }
        running = true
    }

    func stop() {
        guard running else { return }
        running = false
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        lock.lock()
        ring = [Float](repeating: 0, count: windowSize)
        writePos = 0
        lock.unlock()
    }

    /// Mezcla a mono y escribe en el anillo. Corre en el hilo de audio: sin
    /// reservas de memoria ni trabajo pesado.
    private func append(_ buffer: AVAudioPCMBuffer) {
        guard let channels = buffer.floatChannelData else { return }
        let frames = Int(buffer.frameLength)
        let channelCount = Int(buffer.format.channelCount)
        lock.lock()
        for i in 0..<frames {
            var sample: Float = 0
            for c in 0..<channelCount { sample += channels[c][i] }
            ring[writePos] = sample / Float(channelCount)
            writePos = (writePos + 1) % windowSize
        }
        lock.unlock()
    }

    /// Última ventana de muestras, de la más vieja a la más nueva.
    func read() -> [Float] {
        lock.lock()
        defer { lock.unlock() }
        var out = [Float](repeating: 0, count: windowSize)
        let head = windowSize - writePos
        for i in 0..<head { out[i] = ring[writePos + i] }
        for i in 0..<writePos { out[head + i] = ring[i] }
        return out
    }
}

import SwiftUI

@main
struct UkeleleWatchApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                TunerView()
            }
        }
    }
}

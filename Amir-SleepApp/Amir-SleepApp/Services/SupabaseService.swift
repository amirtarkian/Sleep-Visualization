import Foundation

// TODO: Add supabase-swift package in Xcode:
// File -> Add Package Dependencies -> https://github.com/supabase/supabase-swift
// Then uncomment the Supabase imports and implementation below.

/// Configuration for Supabase connection.
/// Set SUPABASE_URL and SUPABASE_ANON_KEY in Info.plist or via build settings.
enum SupabaseConfig {
    static var url: String {
        Bundle.main.infoDictionary?["SUPABASE_URL"] as? String ?? ""
    }
    static var anonKey: String {
        Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String ?? ""
    }
    static var isConfigured: Bool {
        !url.isEmpty && !anonKey.isEmpty
    }
}

/// Service handling Supabase authentication and data sync.
/// Currently stubbed -- activate by adding supabase-swift package and uncommenting implementation.
@MainActor
@Observable
final class SupabaseService {
    var isAuthenticated = false
    var userEmail: String?
    var userId: String?
    var syncEnabled: Bool { SupabaseConfig.isConfigured }

    // MARK: - Auth

    /// Sign in using an Apple identity token from ASAuthorization.
    func signInWithApple(identityToken: String) async throws {
        // TODO: Implement with supabase-swift
        // import Supabase
        // let client = SupabaseClient(supabaseURL: URL(string: SupabaseConfig.url)!, supabaseKey: SupabaseConfig.anonKey)
        // let session = try await client.auth.signInWithIdToken(
        //     credentials: .init(provider: .apple, idToken: identityToken)
        // )
        // userId = session.user.id.uuidString
        // userEmail = session.user.email

        // Stub: mark as authenticated so the app is usable during development
        isAuthenticated = true
    }

    /// Sign out the current user.
    func signOut() async throws {
        // TODO: Implement with supabase-swift
        // try await client.auth.signOut()
        isAuthenticated = false
        userEmail = nil
        userId = nil
    }

    /// Check for an existing Supabase session on app launch.
    func checkSession() async {
        // TODO: Implement with supabase-swift
        // if let session = try? await client.auth.session {
        //     userId = session.user.id.uuidString
        //     userEmail = session.user.email
        //     isAuthenticated = true
        // }

        // Stub: no persisted session
        isAuthenticated = false
    }

    // MARK: - Data Sync

    /// Push a sleep session payload to the `sleep_sessions` table.
    func pushSleepSession(_ payload: [String: Any]) async throws {
        guard syncEnabled, isAuthenticated else { return }
        // TODO: Implement with supabase-swift
        // var data = payload
        // data["user_id"] = userId
        // try await client.from("sleep_sessions")
        //     .upsert(data, onConflict: "user_id,night_date")
        //     .execute()
    }

    /// Push a readiness record payload to the `readiness_records` table.
    func pushReadinessRecord(_ payload: [String: Any]) async throws {
        guard syncEnabled, isAuthenticated else { return }
        // TODO: Implement with supabase-swift
        // var data = payload
        // data["user_id"] = userId
        // try await client.from("readiness_records")
        //     .upsert(data, onConflict: "user_id,date")
        //     .execute()
    }

    /// Push user goals to the `user_goals` table.
    func pushGoals(_ payload: [String: Any]) async throws {
        guard syncEnabled, isAuthenticated else { return }
        // TODO: Implement with supabase-swift
        // var data = payload
        // data["user_id"] = userId
        // try await client.from("user_goals")
        //     .upsert(data, onConflict: "user_id")
        //     .execute()
    }

    /// Fetch user goals from the `user_goals` table.
    func fetchGoals() async throws -> [String: Any]? {
        guard syncEnabled, isAuthenticated else { return nil }
        // TODO: Implement with supabase-swift
        // let response = try await client.from("user_goals")
        //     .select()
        //     .eq("user_id", value: userId ?? "")
        //     .single()
        //     .execute()
        // return response.value
        return nil
    }
}

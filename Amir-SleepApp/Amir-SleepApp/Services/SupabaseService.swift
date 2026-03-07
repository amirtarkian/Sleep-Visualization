import Foundation
import Supabase

// PREREQUISITE: Add supabase-swift package in Xcode:
// File -> Add Package Dependencies -> https://github.com/supabase/supabase-swift
// Version: Up to Next Major from 3.0.0
// Add "Supabase" product to the app target.

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

enum SupabaseError: LocalizedError {
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in Info.plist."
        }
    }
}

/// Service handling Supabase authentication and data sync.
@MainActor
@Observable
final class SupabaseService {
    var isAuthenticated = false
    var userEmail: String?
    var userId: String?
    var syncEnabled: Bool { SupabaseConfig.isConfigured }

    /// Lazy Supabase client — only created when URL and key are configured.
    private lazy var client: SupabaseClient? = {
        guard SupabaseConfig.isConfigured,
              let url = URL(string: SupabaseConfig.url) else { return nil }
        return SupabaseClient(supabaseURL: url, supabaseKey: SupabaseConfig.anonKey)
    }()

    // MARK: - Auth

    /// Sign in using an Apple identity token from ASAuthorization.
    func signInWithApple(identityToken: String) async throws {
        guard let client else { throw SupabaseError.notConfigured }
        let session = try await client.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: identityToken)
        )
        userId = session.user.id.uuidString
        userEmail = session.user.email
        isAuthenticated = true
    }

    /// Sign out the current user.
    func signOut() async throws {
        if let client {
            try await client.auth.signOut()
        }
        isAuthenticated = false
        userEmail = nil
        userId = nil
    }

    /// Check for an existing Supabase session on app launch.
    func checkSession() async {
        guard let client else {
            isAuthenticated = false
            return
        }
        do {
            let session = try await client.auth.session
            userId = session.user.id.uuidString
            userEmail = session.user.email
            isAuthenticated = true
        } catch {
            isAuthenticated = false
        }
    }

    // MARK: - Data Sync

    /// Push a sleep session payload to the `sleep_sessions` table.
    func pushSleepSession(_ payload: [String: Any]) async throws {
        guard syncEnabled, isAuthenticated, let client else { return }
        var data = payload
        data["user_id"] = userId
        try await client.from("sleep_sessions")
            .upsert(toJSON(data), onConflict: "user_id,night_date")
            .execute()
    }

    /// Push a readiness record payload to the `readiness_records` table.
    func pushReadinessRecord(_ payload: [String: Any]) async throws {
        guard syncEnabled, isAuthenticated, let client else { return }
        var data = payload
        data["user_id"] = userId
        try await client.from("readiness_records")
            .upsert(toJSON(data), onConflict: "user_id,date")
            .execute()
    }

    /// Push user goals to the `sleep_goals` table.
    func pushGoals(_ payload: [String: Any]) async throws {
        guard syncEnabled, isAuthenticated, let client else { return }
        var data = payload
        data["user_id"] = userId
        try await client.from("sleep_goals")
            .upsert(toJSON(data), onConflict: "user_id")
            .execute()
    }

    /// Fetch user goals from the `sleep_goals` table.
    func fetchGoals() async throws -> [String: Any]? {
        guard syncEnabled, isAuthenticated, let client, let userId else { return nil }
        let data: Data = try await client.from("sleep_goals")
            .select()
            .eq("user_id", value: userId)
            .limit(1)
            .single()
            .execute()
            .data
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        return json
    }

    // MARK: - Private Helpers

    /// Convert a [String: Any] payload to JSON Data for supabase-swift upsert.
    private func toJSON(_ dict: [String: Any]) -> Data {
        let cleaned = dict.compactMapValues { value -> Any? in
            // Strip NSNull / nil optionals that come from `as Any`
            if value is NSNull { return nil }
            return value
        }
        return (try? JSONSerialization.data(withJSONObject: cleaned)) ?? Data()
    }
}

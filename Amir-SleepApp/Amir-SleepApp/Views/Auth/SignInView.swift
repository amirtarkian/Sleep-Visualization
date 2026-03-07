import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @Environment(SupabaseService.self) private var supabase
    @State private var error: String?

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                // App icon
                Image(systemName: "moon.zzz.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.purple)

                Text("SleepViz")
                    .font(.largeTitle).bold()
                    .foregroundColor(.white)

                Text("Your personalized sleep dashboard")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))

                Spacer()

                // Apple Sign-In button
                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.email, .fullName]
                } onCompletion: { result in
                    Task { await handleSignIn(result: result) }
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 50)
                .cornerRadius(12)
                .padding(.horizontal, 40)

                #if DEBUG
                // Skip auth button for development
                Button("Continue without sign in") {
                    supabase.isAuthenticated = true
                }
                .font(.caption)
                .foregroundColor(.white.opacity(0.4))
                #endif

                if let error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal, 40)
                        .multilineTextAlignment(.center)
                }

                Spacer().frame(height: 40)
            }
        }
    }

    // MARK: - Apple Sign-In Handler

    private func handleSignIn(result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let tokenString = String(data: tokenData, encoding: .utf8)
            else {
                error = "Could not get Apple ID token"
                return
            }
            do {
                try await supabase.signInWithApple(identityToken: tokenString)
            } catch {
                self.error = error.localizedDescription
            }
        case .failure(let err):
            error = err.localizedDescription
        }
    }
}

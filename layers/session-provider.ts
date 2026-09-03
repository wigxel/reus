import { Cause, Context, type Effect } from "effect";

export interface SessionUser {
  id: string;
}

export interface SessionInfo {
  id: string;
  expiresAt: Date;
  fresh: boolean;
  userId: string;
}

export type SessionProviderImpl = {
  createSession(user_id: string): Effect.Effect<
    { session_id: string; expires_at: Date },
    Cause.UnknownError
  >;

  validateSession(session_id: string): Effect.Effect<
    { user: SessionUser; session: SessionInfo },
    Cause.UnknownError | Cause.NoSuchElementError
  >;

  invalidateSession(session_id: string): Effect.Effect<void>;

  invalidateUserSessions(user_id: string): Effect.Effect<void>;
};

export class SessionProvider extends Context.Service<SessionProvider,
  SessionProviderImpl>()("SessionProvider") {}

import { Context, type Effect } from "effect";
import type { UnknownException } from "effect/Cause";

type AuthError = UnknownException | Error;

interface AuthUserImpl {
  getUserRecord: (body: { email: string }) => Effect.Effect<
    { user_id: string; password: string },
    AuthError
  >;
}

export class AuthUserCtx extends Context.Tag("AuthUser")<
  AuthUserCtx,
  AuthUserImpl
>() {}

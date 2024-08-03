import { Context, Effect, Layer, pipe } from "effect";
import { LuciaSessionProvider } from "~/adapters/lucia-session-provider";
import { DatabaseLive } from "~/layers/database";
import { Argon2dHasherLive } from "~/layers/encryption/presets/argon2d";
import { UserSessionLive } from "~/layers/session";
import { notNil } from "~/libs/query.helpers";
import { OTPRepoLayer } from "~/repositories/otp.repository";
import { UserRepo, UserRepoLayer } from "~/repositories/user.repository";

export class AuthUser extends Context.Tag("AuthUser")<
  AuthUser,
  AuthUserService
>() {}

export class AuthUserService {
  getUserRecord({ email }) {
    return Effect.gen(function* (_) {
      const repo = yield* _(UserRepo);

      const user = yield* pipe(
        repo.findFirst({ email }),
        Effect.flatMap(notNil),
      );

      return {
        email: String(user.email),
        first_name: user.firstName,
        user_id: String(user.id),
        password: user.password,
        email_verified: !!user.emailVerified,
      };
    });
  }
}

const AuthUserLive = Layer.succeed(AuthUser, new AuthUserService());

export const AuthLive = Layer.empty.pipe(
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(OTPRepoLayer),
  Layer.provideMerge(UserSessionLive),
  Layer.provideMerge(LuciaSessionProvider),
  Layer.provideMerge(Argon2dHasherLive),
  Layer.provideMerge(UserRepoLayer.Repo.Live),
  Layer.provideMerge(AuthUserLive),
);

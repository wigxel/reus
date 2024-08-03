import { Effect, pipe } from "effect";
import { TaggedError } from "effect/Data";
import { generateOTP } from "~/adapters/otp/oslo-totp";
import { ExpectedError, PermissionError } from "~/config/exceptions";
import { AuthUser } from "~/layers/auth-user";
import { hashPassword, verifyPassword } from "~/layers/encryption/helpers";
import { Session } from "~/layers/session";
import { OtpRepo } from "~/repositories/otp.repository";
import { UserRepoLayer } from "~/repositories/user.repository";
import { sendmail } from "./mail.service";

export function logout({ access_token }: { access_token: string }) {
  return Effect.gen(function* (_) {
    const session = yield* Session;
    const response = { message: "Session terminated" } as const;

    // validate authorization token
    return yield* _(
      session.validate(access_token),
      Effect.flatMap(() => session.invalidate(access_token)),
      Effect.match({
        onSuccess: () => response,
        onFailure: () => response,
      }),
    );
  });
}

export function login({ body }: { body: { email: string; password: string } }) {
  return Effect.gen(function* (_) {
    const session = yield* Session;
    const auth_user = yield* AuthUser;

    const error = new PermissionError("Invalid username or password provided");

    yield* _(Effect.logDebug("Getting authenticated User"));
    const user = yield* _(
      pipe(
        auth_user.getUserRecord({ email: body.email }),
        Effect.mapError(() => error),
      ),
    );

    yield* Effect.logDebug("Verify password");

    yield* _(
      verifyPassword(body.password, user?.password ?? ""),
      Effect.mapError(() => error),
    );

    // makes sure the user's email is verified
    if (user.email_verified !== true) {
      const otp = yield* generateOTP();
      const otpRepo = yield* OtpRepo;

      yield* otpRepo.create({
        userId: user.user_id,
        userKind: "USER",
        otpReason: "EMAIL_VERIFICATION",
        value: otp,
      });

      yield* sendmail({
        to: user.email,
        subject: "Email Verification",
        text: `Welcome ${user.first_name}\nHere's an OTP to verify your email ${otp}`,
      });

      return yield* new ExpectedError(
        `Please verify your email ${user.email}. We sent a verification email to your inbox`,
      );
    }

    yield* Effect.logDebug("Creating session");
    const { session_id, expires_at } = yield* _(
      session.create(user.user_id),
      Effect.mapError(() => error),
    );

    yield* Effect.logDebug("Session created");

    return {
      message: "Login successful",
      data: {
        access_token: session_id,
        expires: expires_at.toISOString(),
      },
    };
  });
}

export class HashingError extends TaggedError("HashingError") {
  constructor(public message: string) {
    super();
  }
}

export const changePassword = (
  userId: string,
  oldPassword: string,
  newPassword: string,
) => {
  return Effect.gen(function* (_) {
    const userRepo = yield* UserRepoLayer.Tag;
    const userProfile = yield* userRepo.findFirst({
      id: userId,
    });

    const isMatch = yield* verifyPassword(oldPassword, userProfile.password);

    if (!isMatch) {
      return yield* Effect.fail(
        new ExpectedError(
          "Password update failed. Current password is invalid",
        ),
      );
    }

    const newHash = yield* hashPassword(newPassword);

    return yield* userRepo.update(userId, { password: newHash });
  });
};

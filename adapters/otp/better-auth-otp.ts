import { Config, Effect, Layer, Redacted } from "effect";
import { createOTP } from "@better-auth/utils/otp";
import { OTPError, OTPService } from "~/contexts/otp";

export const readOTPSecret = Effect.cached(
  Effect.gen(function* () {
    const secret = yield* Config.redacted("OTP_SECRET");
    return Redacted.value(secret);
  }),
).pipe(Effect.flatten);

export const generateOTP = () =>
  readOTPSecret.pipe(
    Effect.flatMap((secret) =>
      Effect.tryPromise({
        try: () => createOTP(secret, { digits: 6, period: 30 }).totp(),
        catch: () => new OTPError("Error generating OTP"),
      }),
    ),
  );

export const verifyOTP = (otp: string) =>
  readOTPSecret.pipe(
    Effect.flatMap((secret) =>
      Effect.tryPromise({
        try: () => createOTP(secret, { digits: 6, period: 30 }).verify(otp),
        catch: () => new OTPError("Error verifying OTP"),
      }).pipe(
        Effect.flatMap((ok) =>
          ok ? Effect.succeed(true) : Effect.fail(new OTPError("Invalid OTP")),
        ),
      ),
    ),
  );

export const BetterAuthOTP = Layer.succeed(OTPService, {
  generate: generateOTP,
  verify: verifyOTP,
});

// legacy alias for AuthLive compat
export const OsloTOTP = BetterAuthOTP;

import { Config, Effect, Redacted } from "effect";
import { TaggedError } from "effect/Data";
import { TimeSpan } from "oslo";
import { TOTPController } from "oslo/otp";
import { base64ToArrayBuffer } from "~/adapters/otp/otp.util";

export const readOTPSecret = Effect.cached(
  Effect.gen(function* () {
    const secret_string = yield* Config.redacted("OTP_SECRET");

    return yield* Effect.try({
      try: () => base64ToArrayBuffer(Redacted.value(secret_string)),
      catch: () =>
        new OTPError("Error validating secret. Invalid OTP Secret provided"),
    });
  }),
).pipe(Effect.flatten);

const otpService = new TOTPController({
  period: new TimeSpan(30, "m"),
});

export const generateOTP = () => {
  return readOTPSecret.pipe(
    Effect.flatMap((secret) =>
      Effect.tryPromise({
        try: () => otpService.generate(secret),
        catch: () => {
          return new OTPError("Error generating OTP");
        },
      }),
    ),
  );
};

export const verifyOTP = (otp: string) => {
  return readOTPSecret.pipe(
    Effect.flatMap((secret) => {
      return Effect.tryPromise({
        try: () => otpService.verify(otp, secret),
        catch: () => {
          return new OTPError("Error verifying OTP");
        },
      });
    }),
  );
};

export class OTPError extends TaggedError("OTPError") {
  constructor(public message: string) {
    super();
  }
}

import { Config, Effect, Layer, Redacted } from "effect";
import { TimeSpan } from "oslo";
import { TOTPController } from "oslo/otp";
import { base64ToArrayBuffer } from "~/adapters/utils";
import { OTPError, OTPService } from "~/layers/otp";

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
        catch: () => new OTPError("Error verifying OTP"),
      });
    }),
  );
};

export const OsloTOTP = Layer.succeed(OTPService, {
  generate: generateOTP,
  verify: verifyOTP,
});

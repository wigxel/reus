import { Config, Effect, Layer, Redacted } from "effect";
import { TimeSpan } from "oslo";
import { TOTPController } from "oslo/otp";
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let base64String = "";

  for (let i = 0; i < uint8Array.length; i++) {
    base64String += String.fromCharCode(uint8Array[i]);
  }

  return btoa(base64String);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const byteArray = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    byteArray[i] = binaryString.charCodeAt(i);
  }

  return byteArray.buffer;
}

export const OsloTOTP = Layer.succeed(OTPService, {
  generate: generateOTP,
  verify: verifyOTP,
});

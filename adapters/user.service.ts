import { Effect } from "effect";
import { generateOTP, verifyOTP } from "~/adapters/otp/oslo-totp";
import { ExpectedError } from "~/config/exceptions";
import { hashPassword } from "~/layers/encryption/helpers";
import { Session } from "~/layers/session_";
import type { NewUser } from "~/migrations/schema";
import { OtpRepo } from "~/repositories/otp.repository";
import { UserRepoLayer } from "~/repositories/user.repository";
import { HashingError } from "./auth.service";
import { sendmail } from "./mail.service";

export function createUser(data: NewUser) {
  return Effect.gen(function* (_) {
    const userRepo = yield* UserRepoLayer.Tag;
    const sessionManager = yield* Session;

    const hashProgram = hashPassword(data.password).pipe(
      Effect.mapError(() => new HashingError("Password encryption failed")),
    );

    data.password = yield* hashProgram;

    const user = yield* userRepo.create(data);
    const otp = yield* generateOTP();

    const otpRepo = yield* OtpRepo;
    yield* otpRepo.create({
      userId: user.id,
      userKind: "USER",
      otpReason: "EMAIL_VERIFICATION",
      value: otp,
    });

    const session_data = yield* sessionManager.create(user.id);

    yield* sendmail({
      to: user.email,
      subject: "Email Verification",
      text: `Welcome ${user.firstName}\nHere's an OTP to verify your email ${otp}`,
    });

    return {
      session: session_data,
      user,
    };
  });
}

export function requestEmailVerificationOtp(email: string) {
  return Effect.gen(function* (_) {
    const userRepo = yield* UserRepoLayer.Tag;

    const user = yield* userRepo.findFirst({ email });

    if (!user) return yield* new ExpectedError("User with email doesn't exist");

    if (user.emailVerified)
      return yield* new ExpectedError("Email already verified");

    const otp = yield* generateOTP();

    const otpRepo = yield* OtpRepo;
    yield* otpRepo.create({
      userId: user.id,
      userKind: "USER",
      otpReason: "EMAIL_VERIFICATION",
      value: otp,
    });

    yield* sendmail({
      to: user.email,
      subject: "Email Verification",
      text: `Welcome ${user.firstName}\nHere's an OTP to verify your email ${otp}`,
    });

    return {
      success: true,
      message: "OTP has been sent to email",
    };
  });
}

export function forgotPassword(email: string) {
  return Effect.gen(function* (_) {
    const userRepo = yield* UserRepoLayer.Tag;

    const user = yield* userRepo.findFirst({ email });

    if (!user) {
      // REASON: Giving a vague response for security reasons
      return new ExpectedError("Request is being processed");
    }

    const otp = yield* generateOTP();

    const otpRepo = yield* OtpRepo;
    yield* otpRepo.create({
      userId: user.id,
      userKind: "USER",
      otpReason: "PASSWORD_RESET",
      value: otp,
    });

    yield* sendmail({
      to: user.email,
      subject: "Forgot Password",
      text: `Hello ${user.firstName}\nHere's an OTP to reset your email ${otp}`,
    });

    return {
      success: true,
      message: "OTP has been sent to email",
    };
  });
}

export function passwordReset(data: { otp: string; password: string }) {
  return Effect.gen(function* (_) {
    yield* verifyOTP(data.otp);

    const otpRepo = yield* OtpRepo;
    const storedOtp = yield* otpRepo.findOne(data.otp);

    if (!storedOtp) {
      return yield* new ExpectedError("Invalid OTP");
    }

    const hashedPassword = yield* hashPassword(data.password);

    const userRepo = yield* UserRepoLayer.Tag;
    yield* _(
      userRepo.update(storedOtp.userId, {
        password: hashedPassword,
        emailVerified: true, // REASON: Password resets should make user verified. See: https://thecopenhagenbook.com/password-reset
      }),
      Effect.mapError((err) => new ExpectedError("Invalid user")),
    );

    yield* otpRepo.deleteOne(data.otp);

    return {
      success: true,
      message: "Password updated",
    };
  });
}

export function verifyUserEmail(otp: string) {
  return Effect.gen(function* () {
    yield* verifyOTP(otp);

    const otpRepo = yield* OtpRepo;
    const storedOtp = yield* otpRepo.findOne(otp);

    if (!storedOtp) {
      return yield* new ExpectedError("Invalid OTP");
    }

    const userRepo = yield* UserRepoLayer.Tag;
    yield* userRepo.update(storedOtp.userId, { emailVerified: true });

    yield* otpRepo.deleteOne(otp);

    return {
      success: true,
      message: "Email verified",
    };
  });
}

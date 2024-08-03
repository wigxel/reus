import { Config, Console, Effect } from "effect";
import nodemailer from "nodemailer";
import type { SendMailRaw } from "~/types/types";

const MailConfig = Effect.gen(function* () {
  const host = yield* Config.string("MAIL_HOST");
  const port = yield* Config.number("MAIL_PORT");
  const user = yield* Config.string("MAIL_USERNAME");
  const pass = yield* Config.string("MAIL_PASSWORD");
  const from = yield* Config.string("MAIL_FROM");
  const nodeEnv = yield* Config.string("NODE_ENV");

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: nodeEnv === "production",
  };
});

export const sendmail = (options: SendMailRaw) => {
  return Effect.gen(function* (_) {
    const smtpCredentials = yield* MailConfig;
    const transporter = yield* MailTransporter;
    const canSendEmail = yield* Config.boolean("ENABLE_MAILING").pipe(
      Config.withDefault(true),
    );

    if (!options.from) {
      options.from = { name: "Wigxel", address: smtpCredentials.from };
    }

    if (!canSendEmail) {
      return yield* Effect.succeed("Skipping email");
    }

    return yield* Effect.tryPromise({
      try: () => transporter.sendMail(options),
      catch: (unknown) => new Error(`Couldn't send mail ${unknown}`),
    });
  });
};

const MailTransporter = Effect.gen(function* (_) {
  const { host, port, user, pass, secure } = yield* MailConfig;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
});

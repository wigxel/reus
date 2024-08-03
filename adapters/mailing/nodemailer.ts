import { Effect, Layer } from "effect";
import nodemailer from "nodemailer";
import { MailTransporter, MailingConfig, MailingError } from "~/layers/mailing";

export const NodeMailerTransporter = Layer.succeed(MailTransporter, {
  send(params, content) {
    return Effect.gen(function* (_) {
      const mailingConfig = yield* MailingConfig;

      const transporter = nodemailer.createTransport({
        host: mailingConfig.host,
        port: mailingConfig.port,
        auth: {
          user: mailingConfig.user,
          pass: mailingConfig.password,
        },
      });

      yield* Effect.tryPromise({
        try: async () => transporter.sendMail({ ...params, ...content }),
        catch: (err) =>
          new MailingError(
            "Error sending mail via the Mailtrap Transporter",
            err as Error,
          ),
      });
    });
  },
});

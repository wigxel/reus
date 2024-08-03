import { Config, type ConfigError, Context, Effect } from "effect";
import { TaggedError } from "effect/Data";

export const MailingConfig = Effect.gen(function* (_) {
  const MAIL_USER = yield* Config.string("MAIL_USER");
  const MAIL_PASSWORD = yield* Config.string("MAIL_PASSWORD");
  const MAIL_HOST = yield* Config.string("MAIL_HOST");
  const MAIL_PORT = yield* Config.number("MAIL_PORT");

  return {
    host: MAIL_HOST,
    port: MAIL_PORT,
    user: MAIL_USER,
    password: MAIL_PASSWORD,
  };
});

export class MailTransporter extends Context.Tag("MailTransporter")<
  MailTransporter,
  MailServiceInterface
>() {}

export interface MailServiceInterface {
  send(
    params: MailOptions,
    content?: MailContent,
  ): Effect.Effect<void, MailingError | ConfigError.ConfigError>;
}

export interface MailAddress {
  name: string;
  address: string;
}

export class MailingError extends TaggedError("MailingError") {
  constructor(
    public message: string,
    public reason: Error,
  ) {
    super();
  }
}

export interface MailOptions {
  /** The e-mail address of the sender. All e-mail addresses can be plain 'sender@server.com' or formatted 'Sender Name <sender@server.com>' */
  from?: string | MailAddress | undefined;
  /** An e-mail address that will appear on the Sender: field */
  sender?: string | MailAddress | undefined;
  /** Comma separated list or an array of recipients e-mail addresses that will appear on the To: field */
  to?: string | MailAddress | Array<string | MailAddress> | undefined;
  /** Comma separated list or an array of recipients e-mail addresses that will appear on the Cc: field */
  cc?: string | MailAddress | Array<string | MailAddress> | undefined;
  /** Comma separated list or an array of recipients e-mail addresses that will appear on the Bcc: field */
  bcc?: string | MailAddress | Array<string | MailAddress> | undefined;
  /** Comma separated list or an array of e-mail addresses that will appear on the Reply-To: field */
  replyTo?: string | MailAddress | Array<string | MailAddress> | undefined;
  /** The message-id this message is replying */
  inReplyTo?: string | MailAddress | undefined;
  /** The subject of the email */
  subject?: string | undefined;
}

export interface MailContent {
  text?: string | Buffer | undefined;
  /** The HTML version of the message */
  html?: string | Buffer | undefined;
  /** Apple Watch specific HTML version of the message, same usage as with text and html */
  watchHtml?: string | Buffer | undefined;
}

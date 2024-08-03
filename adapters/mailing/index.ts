import { Context, type Effect } from "effect";
import { TaggedError } from "effect/Data";

export interface EmailContent extends MailContent {}

export class MailService extends Context.Tag("MailService")<
  MailService,
  MailServiceInterface
>() {}

interface MailServiceInterface {
  send(
    params: MailOptions,
    content?: EmailContent,
  ): Effect.Effect<void, MailingError>;
}

export class MailingError extends TaggedError("MailingError") {
  constructor(
    public message: string,
    public reason: Error,
  ) {
    super();
  }
}

interface MailAddress {
  name: string;
  address: string;
}

interface MailOptions {
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

interface MailContent {
  text?: string | Buffer | undefined;
  /** The HTML version of the message */
  html?: string | Buffer | undefined;
  /** Apple Watch specific HTML version of the message, same usage as with text and html */
  watchHtml?: string | Buffer | undefined;
}

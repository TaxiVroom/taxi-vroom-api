// What the app reads to know what the message is about, e.g. its ride. Text
// only: the Admin SDK types data values as strings.
export interface PushData {
  [key: string]: string;
}

export interface PushMessage {
  title: string;
  body: string;
  // After this, a phone that was unreachable no longer gets the message.
  expiresInMs: number;
  data?: PushData;
}

export enum PushResult {
  sent = 'SENT',
  // The phone no longer exists for Firebase: never send to it again.
  tokenGone = 'TOKEN_GONE',
}

export interface PushSenderPort {
  send(token: string, message: PushMessage): Promise<PushResult>;
}

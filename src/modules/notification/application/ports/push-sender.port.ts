export interface PushMessage {
  title: string;
  body: string;
  // After this, a phone that was unreachable no longer gets the message.
  expiresInMs: number;
}

export enum PushResult {
  sent = 'SENT',
  // The phone no longer exists for Firebase: never send to it again.
  tokenGone = 'TOKEN_GONE',
}

export interface PushSenderPort {
  send(token: string, message: PushMessage): Promise<PushResult>;
}

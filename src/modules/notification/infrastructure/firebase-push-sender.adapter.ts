import { Injectable } from '@nestjs/common';
import { addMilliseconds, getUnixTime } from 'date-fns';
import { getMessaging } from 'firebase-admin/messaging';
import {
  PushMessage,
  PushResult,
  PushSenderPort,
} from '@modules/notification/application/ports/push-sender.port';

// Created by the app: Android shows it with sound, over other apps.
const androidChannelId = 'rides';

const tokenGoneCode = 'messaging/registration-token-not-registered';

// Always a visible notification the user acts on: what high priority is for.
// https://firebase.google.com/docs/cloud-messaging/android/message-priority
@Injectable()
export class FirebasePushSenderAdapter implements PushSenderPort {
  async send(token: string, message: PushMessage): Promise<PushResult> {
    const { title, body, expiresInMs } = message;
    const expiresAt = addMilliseconds(new Date(), expiresInMs);
    try {
      await getMessaging().send({
        token,
        notification: { title, body },
        android: {
          priority: 'high',
          ttl: expiresInMs,
          notification: { channelId: androidChannelId },
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-expiration': getUnixTime(expiresAt).toString(),
          },
          payload: { aps: { sound: 'default' } },
        },
      });
      return PushResult.sent;
    } catch (error) {
      if ((error as { code?: string }).code === tokenGoneCode) {
        return PushResult.tokenGone;
      }
      throw error;
    }
  }
}

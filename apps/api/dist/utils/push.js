import { Expo } from 'expo-server-sdk';
const expo = new Expo();
export async function sendPushNotification(token, { title, body }) {
    if (!Expo.isExpoPushToken(token))
        return;
    try {
        await expo.sendPushNotificationsAsync([{ to: token, title, body, sound: 'default' }]);
    }
    catch (err) {
        console.error('Push notification error:', err);
    }
}

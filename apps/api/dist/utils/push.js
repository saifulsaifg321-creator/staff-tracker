"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
const expo_server_sdk_1 = require("expo-server-sdk");
const expo = new expo_server_sdk_1.Expo();
async function sendPushNotification(token, { title, body }) {
    if (!expo_server_sdk_1.Expo.isExpoPushToken(token))
        return;
    try {
        await expo.sendPushNotificationsAsync([{ to: token, title, body, sound: 'default' }]);
    }
    catch (err) {
        console.error('Push notification error:', err);
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clockIn = clockIn;
exports.clockOut = clockOut;
exports.getTodayStatus = getTodayStatus;
exports.getAttendanceHistory = getAttendanceHistory;
exports.checkAndAlertLate = checkAndAlertLate;
const prisma_js_1 = require("../../utils/prisma.js");
const push_js_1 = require("../../utils/push.js");
async function clockIn(userId) {
    const today = new Date(new Date().toDateString());
    const now = new Date();
    const user = await prisma_js_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const existing = await prisma_js_1.prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } },
    });
    if (existing?.clockIn)
        throw new Error('Already clocked in today');
    const [shiftH, shiftM] = user.shiftStartTime.split(':').map(Number);
    const shiftStart = new Date(today);
    shiftStart.setHours(shiftH, shiftM, 0, 0);
    const lateMinutes = Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / 60000));
    const status = lateMinutes >= 20 ? 'LATE' : 'PRESENT';
    const attendance = await prisma_js_1.prisma.attendance.upsert({
        where: { userId_date: { userId, date: today } },
        update: { clockIn: now, status, lateMinutes },
        create: { userId, date: today, clockIn: now, status, lateMinutes },
    });
    return { attendance, lateMinutes };
}
async function clockOut(userId) {
    const today = new Date(new Date().toDateString());
    const now = new Date();
    const attendance = await prisma_js_1.prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } },
    });
    if (!attendance)
        throw new Error('No clock-in found for today');
    if (attendance.clockOut)
        throw new Error('Already clocked out today');
    const updated = await prisma_js_1.prisma.attendance.update({
        where: { userId_date: { userId, date: today } },
        data: { clockOut: now },
    });
    return updated;
}
async function getTodayStatus(userId) {
    const today = new Date(new Date().toDateString());
    const attendance = await prisma_js_1.prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } },
    });
    return attendance;
}
async function getAttendanceHistory(userId, days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return prisma_js_1.prisma.attendance.findMany({
        where: { userId, date: { gte: from } },
        orderBy: { date: 'desc' },
    });
}
async function checkAndAlertLate() {
    const now = new Date();
    const today = new Date(new Date().toDateString());
    const employees = await prisma_js_1.prisma.user.findMany({
        where: { role: 'EMPLOYEE', isActive: true },
    });
    for (const emp of employees) {
        const [shiftH, shiftM] = emp.shiftStartTime.split(':').map(Number);
        const alertTime = new Date(today);
        alertTime.setHours(shiftH, shiftM + 20, 0, 0);
        if (now < alertTime)
            continue;
        const attendance = await prisma_js_1.prisma.attendance.findUnique({
            where: { userId_date: { userId: emp.id, date: today } },
        });
        if (attendance?.clockIn)
            continue;
        const alreadyAlerted = await prisma_js_1.prisma.lateAlert.findFirst({
            where: { userId: emp.id, date: today },
        });
        if (alreadyAlerted)
            continue;
        await prisma_js_1.prisma.lateAlert.create({
            data: { userId: emp.id, date: today, scheduledAt: now, notifiedAt: now },
        });
        if (emp.expoPushToken) {
            await (0, push_js_1.sendPushNotification)(emp.expoPushToken, {
                title: 'Late Alert',
                body: `You are 20+ minutes late. Please update your manager.`,
            });
        }
        const managers = await prisma_js_1.prisma.user.findMany({
            where: {
                role: { in: ['MANAGER', 'ADMIN'] },
                isActive: true,
                expoPushToken: { not: null },
                ...(emp.projectId ? { projectId: emp.projectId } : emp.companyId ? { companyId: emp.companyId } : {}),
            },
            select: { expoPushToken: true },
        });
        for (const mgr of managers) {
            if (mgr.expoPushToken) {
                await (0, push_js_1.sendPushNotification)(mgr.expoPushToken, {
                    title: 'Employee Late',
                    body: `${emp.name} has not clocked in and is 20+ minutes late.`,
                });
            }
        }
    }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSickDocReminderCron = startSickDocReminderCron;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_js_1 = require("../../utils/prisma.js");
const push_js_1 = require("../../utils/push.js");
async function sendSickDocReminders() {
    const pending = await prisma_js_1.prisma.leaveRequest.findMany({
        where: {
            type: { in: ['SICK_WITH_DOC', 'SICK_NO_DOC'] },
            status: 'PENDING',
            documentUrl: null,
            user: {
                leaveBalance: { sickNoCertUsed: { gte: 5 } },
            },
        },
        include: {
            user: {
                select: {
                    id: true, name: true, expoPushToken: true,
                    projectId: true, companyId: true,
                },
            },
        },
    });
    for (const request of pending) {
        const emp = request.user;
        if (emp.expoPushToken) {
            await (0, push_js_1.sendPushNotification)(emp.expoPushToken, {
                title: 'Sick Leave: Document Required',
                body: "Please upload your doctor's justification paper. Your sick leave is pending until received.",
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
                    title: 'Awaiting Sick Note',
                    body: `${emp.name} has not yet submitted a doctor's justification paper for their sick leave.`,
                });
            }
        }
        console.log(`Sick doc reminder sent for: ${emp.name} (leave ${request.id})`);
    }
    if (pending.length === 0) {
        console.log('Sick doc reminder: no pending reminders needed');
    }
}
function startSickDocReminderCron() {
    node_cron_1.default.schedule('0 10 * * *', async () => {
        try {
            await sendSickDocReminders();
        }
        catch (err) {
            console.error('Sick doc reminder cron error:', err);
        }
    });
    console.log('Sick doc reminder cron started (runs daily at 10:00am)');
}

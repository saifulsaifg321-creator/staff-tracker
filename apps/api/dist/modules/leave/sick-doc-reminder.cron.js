import cron from 'node-cron';
import { prisma } from '../../utils/prisma.js';
import { sendPushNotification } from '../../utils/push.js';
async function sendSickDocReminders() {
    const pending = await prisma.leaveRequest.findMany({
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
            await sendPushNotification(emp.expoPushToken, {
                title: 'Sick Leave: Document Required',
                body: "Please upload your doctor's justification paper. Your sick leave is pending until received.",
            });
        }
        const managers = await prisma.user.findMany({
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
                await sendPushNotification(mgr.expoPushToken, {
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
export function startSickDocReminderCron() {
    cron.schedule('0 10 * * *', async () => {
        try {
            await sendSickDocReminders();
        }
        catch (err) {
            console.error('Sick doc reminder cron error:', err);
        }
    });
    console.log('Sick doc reminder cron started (runs daily at 10:00am)');
}

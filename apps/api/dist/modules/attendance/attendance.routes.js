import { authenticate, requireManager } from '../../utils/auth-middleware.js';
import { clockIn, clockOut, getTodayStatus, getAttendanceHistory } from './attendance.service.js';
import { prisma } from '../../utils/prisma.js';
export async function attendanceRoutes(app) {
    // Employee: clock in for themselves only (userId from JWT, never from body)
    app.post('/clock-in', { preHandler: authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        try {
            const result = await clockIn(userId);
            return reply.send(result);
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
    // Employee: clock out for themselves only
    app.post('/clock-out', { preHandler: authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        try {
            const result = await clockOut(userId);
            return reply.send(result);
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
    // Employee: view own today's attendance only
    app.get('/today', { preHandler: authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const attendance = await getTodayStatus(userId);
        return reply.send({ attendance });
    });
    // Employee: view own attendance history only
    app.get('/history', { preHandler: authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const { days } = req.query;
        const limit = Math.min(Math.max(Number(days) || 30, 1), 90);
        const history = await getAttendanceHistory(userId, limit);
        return reply.send({ history });
    });
    // Manager: today's attendance — scoped to their project/company
    app.get('/manager/today', { preHandler: requireManager }, async (req, reply) => {
        const { companyId, projectId } = req.user;
        const today = new Date(new Date().toDateString());
        const userWhere = { isActive: true };
        if (projectId)
            userWhere.projectId = projectId;
        else if (companyId)
            userWhere.companyId = companyId;
        const records = await prisma.attendance.findMany({
            where: {
                date: today,
                user: userWhere,
            },
            include: { user: { select: { id: true, name: true, email: true, shiftStartTime: true } } },
            orderBy: { clockIn: 'asc' },
        });
        return reply.send({ records });
    });
    // Manager: late alerts — scoped to their project/company
    app.get('/manager/late-alerts', { preHandler: requireManager }, async (req, reply) => {
        const { companyId, projectId } = req.user;
        const userWhere = {};
        if (projectId)
            userWhere.projectId = projectId;
        else if (companyId)
            userWhere.companyId = companyId;
        const alerts = await prisma.lateAlert.findMany({
            where: {
                resolvedAt: null,
                user: userWhere,
            },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return reply.send({ alerts });
    });
    // Employee: respond to their OWN late alert only
    app.post('/late-alert/:id/respond', { preHandler: authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const { id } = req.params;
        const { response } = req.body;
        if (!response || typeof response !== 'string') {
            return reply.code(400).send({ error: 'Response text is required' });
        }
        const alert = await prisma.lateAlert.findUnique({ where: { id } });
        // Only the owner of the alert can respond — prevents employees accessing each other's data
        if (!alert || alert.userId !== userId) {
            return reply.code(403).send({ error: 'Not authorised' });
        }
        await prisma.lateAlert.update({
            where: { id },
            data: { response: String(response).slice(0, 500), resolvedAt: new Date() },
        });
        return reply.send({ ok: true });
    });
}

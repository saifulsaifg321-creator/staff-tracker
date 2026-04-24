"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRoutes = attendanceRoutes;
const auth_middleware_js_1 = require("../../utils/auth-middleware.js");
const attendance_service_js_1 = require("./attendance.service.js");
const prisma_js_1 = require("../../utils/prisma.js");
async function attendanceRoutes(app) {
    // Employee: clock in for themselves only (userId from JWT, never from body)
    app.post('/clock-in', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        try {
            const result = await (0, attendance_service_js_1.clockIn)(userId);
            return reply.send(result);
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
    // Employee: clock out for themselves only
    app.post('/clock-out', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        try {
            const result = await (0, attendance_service_js_1.clockOut)(userId);
            return reply.send(result);
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
    // Employee: view own today's attendance only
    app.get('/today', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const attendance = await (0, attendance_service_js_1.getTodayStatus)(userId);
        return reply.send({ attendance });
    });
    // Employee: view own attendance history only
    app.get('/history', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const { days } = req.query;
        const limit = Math.min(Math.max(Number(days) || 30, 1), 90);
        const history = await (0, attendance_service_js_1.getAttendanceHistory)(userId, limit);
        return reply.send({ history });
    });
    // Manager: today's attendance — scoped to their project/company
    app.get('/manager/today', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const { companyId, projectId } = req.user;
        const today = new Date(new Date().toDateString());
        const userWhere = { isActive: true };
        if (projectId)
            userWhere.projectId = projectId;
        else if (companyId)
            userWhere.companyId = companyId;
        const records = await prisma_js_1.prisma.attendance.findMany({
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
    app.get('/manager/late-alerts', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const { companyId, projectId } = req.user;
        const userWhere = {};
        if (projectId)
            userWhere.projectId = projectId;
        else if (companyId)
            userWhere.companyId = companyId;
        const alerts = await prisma_js_1.prisma.lateAlert.findMany({
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
    app.post('/late-alert/:id/respond', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const { id } = req.params;
        const { response } = req.body;
        if (!response || typeof response !== 'string') {
            return reply.code(400).send({ error: 'Response text is required' });
        }
        const alert = await prisma_js_1.prisma.lateAlert.findUnique({ where: { id } });
        // Only the owner of the alert can respond — prevents employees accessing each other's data
        if (!alert || alert.userId !== userId) {
            return reply.code(403).send({ error: 'Not authorised' });
        }
        await prisma_js_1.prisma.lateAlert.update({
            where: { id },
            data: { response: String(response).slice(0, 500), resolvedAt: new Date() },
        });
        return reply.send({ ok: true });
    });
}

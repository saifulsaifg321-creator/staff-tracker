"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeRoutes = employeeRoutes;
const prisma_js_1 = require("../../utils/prisma.js");
const auth_middleware_js_1 = require("../../utils/auth-middleware.js");
async function employeeRoutes(app) {
    // Manager: list employees filtered by project (or whole company if no projectId)
    app.get('/', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const { companyId, projectId } = req.user;
        const where = { role: 'EMPLOYEE', isActive: true };
        if (projectId)
            where.projectId = projectId;
        else if (companyId)
            where.companyId = companyId;
        const employees = await prisma_js_1.prisma.user.findMany({
            where,
            select: {
                id: true, name: true, email: true,
                shiftStartTime: true, shiftEndTime: true,
                project: { select: { id: true, name: true } },
                leaveBalance: true,
                attendances: {
                    where: { date: new Date(new Date().toDateString()) },
                    select: { clockIn: true, clockOut: true, status: true },
                },
            },
            orderBy: { name: 'asc' },
        });
        return reply.send({ employees });
    });
    // Manager: get single employee detail
    app.get('/:id', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const { id } = req.params;
        const employee = await prisma_js_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true, name: true, email: true, role: true,
                shiftStartTime: true, shiftEndTime: true, isActive: true,
                project: { select: { id: true, name: true } },
                company: { select: { id: true, name: true } },
                leaveBalance: true,
                attendances: { orderBy: { date: 'desc' }, take: 30 },
                leaveRequests: { orderBy: { createdAt: 'desc' }, take: 20 },
            },
        });
        if (!employee)
            return reply.code(404).send({ error: 'Employee not found' });
        return reply.send({ employee });
    });
    // Manager: update employee shift or project
    app.patch('/:id', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const { id } = req.params;
        const body = req.body;
        const updated = await prisma_js_1.prisma.user.update({
            where: { id },
            data: {
                shiftStartTime: body.shiftStartTime,
                shiftEndTime: body.shiftEndTime,
                projectId: body.projectId,
                isActive: body.isActive,
            },
        });
        return reply.send({ id: updated.id, name: updated.name });
    });
    // Manager: reset annual leave balance
    app.post('/:id/reset-leave', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const { id } = req.params;
        const body = req.body;
        await prisma_js_1.prisma.leaveBalance.upsert({
            where: { userId: id },
            update: {
                year: new Date().getFullYear(),
                holidayTotal: body.holidayTotal ?? 28,
                holidayUsed: 0,
                sickNoCertUsed: 0,
            },
            create: {
                userId: id,
                year: new Date().getFullYear(),
                holidayTotal: body.holidayTotal ?? 28,
                holidayUsed: 0,
                sickNoCertUsed: 0,
                sickNoCertLimit: 5,
            },
        });
        return reply.send({ ok: true });
    });
    // Employee: get own profile
    app.get('/me/profile', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true, role: true,
                shiftStartTime: true, shiftEndTime: true,
                project: { select: { id: true, name: true } },
                company: { select: { id: true, name: true } },
                leaveBalance: true,
            },
        });
        return reply.send({ user });
    });
}

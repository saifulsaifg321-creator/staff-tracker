"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const auth_service_js_1 = require("./auth.service.js");
const auth_middleware_js_1 = require("../../utils/auth-middleware.js");
const prisma_js_1 = require("../../utils/prisma.js");
async function authRoutes(app) {
    // Public: register (first manager only — no company/project yet)
    app.post('/register', async (req, reply) => {
        const body = req.body;
        try {
            const user = await (0, auth_service_js_1.registerUser)(body);
            return reply.code(201).send({ user });
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
    app.post('/login', async (req, reply) => {
        const { email, password } = req.body;
        try {
            const result = await (0, auth_service_js_1.loginUser)(email, password);
            return reply.send(result);
        }
        catch (err) {
            return reply.code(401).send({ error: err.message });
        }
    });
    app.get('/me', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true, role: true,
                companyId: true, projectId: true,
                shiftStartTime: true, shiftEndTime: true,
                company: { select: { id: true, name: true, joinCode: true } },
                project: { select: { id: true, name: true, joinCode: true } },
                leaveBalance: true,
            },
        });
        return reply.send({ user });
    });
    app.patch('/push-token', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const { token } = req.body;
        await prisma_js_1.prisma.user.update({ where: { id: userId }, data: { expoPushToken: token } });
        return reply.send({ ok: true });
    });
    // Manager: create company and link manager to it
    app.post('/company', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const userId = req.user.sub;
        const { name } = req.body;
        try {
            const company = await (0, auth_service_js_1.createCompany)(name);
            await prisma_js_1.prisma.user.update({ where: { id: userId }, data: { companyId: company.id } });
            return reply.code(201).send({ company });
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
    // Manager: get company info
    app.get('/company', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const userId = req.user.sub;
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: userId },
            include: { company: { include: { projects: true } } },
        });
        return reply.send({ company: user?.company });
    });
    // Manager: create a project under their company
    app.post('/projects', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const userId = req.user.sub;
        const manager = await prisma_js_1.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
        const companyId = manager?.companyId;
        if (!companyId)
            return reply.code(400).send({ error: 'Set up your company first' });
        const { name } = req.body;
        try {
            const project = await (0, auth_service_js_1.createProject)(name, companyId);
            return reply.code(201).send({ project });
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
    // Manager: list all projects in their company
    app.get('/projects', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const userId = req.user.sub;
        const manager = await prisma_js_1.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
        const companyId = manager?.companyId;
        if (!companyId)
            return reply.send({ projects: [] });
        const projects = await prisma_js_1.prisma.project.findMany({
            where: { companyId },
            include: { _count: { select: { users: true } } },
            orderBy: { createdAt: 'asc' },
        });
        return reply.send({ projects });
    });
    // Manager: add employee or manager to their company/project
    app.post('/manager/add-user', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const userId = req.user.sub;
        const manager = await prisma_js_1.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true, projectId: true } });
        const { companyId, projectId } = manager ?? {};
        if (!companyId)
            return reply.code(400).send({ error: 'Set up your company first' });
        const body = req.body;
        try {
            const user = await (0, auth_service_js_1.registerUser)({ ...body, companyId, projectId: body.projectId ?? projectId });
            return reply.code(201).send({ user });
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
}

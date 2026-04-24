"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveRoutes = leaveRoutes;
const auth_middleware_js_1 = require("../../utils/auth-middleware.js");
const leave_service_js_1 = require("./leave.service.js");
const prisma_js_1 = require("../../utils/prisma.js");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
async function leaveRoutes(app) {
    // Employee: submit leave request
    app.post('/request', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const body = req.body;
        const allowed = ['HOLIDAY', 'SICK_NO_DOC', 'SICK_WITH_DOC', 'EMERGENCY'];
        if (!allowed.includes(body?.type))
            return reply.code(400).send({ error: 'Invalid leave type' });
        if (!body?.startDate || !body?.endDate)
            return reply.code(400).send({ error: 'Start and end date required' });
        try {
            const result = await (0, leave_service_js_1.requestLeave)(userId, body);
            return reply.code(201).send(result);
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
    // Employee: upload sick leave document (own requests only)
    app.post('/request/:id/upload', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const { id } = req.params;
        // Verify this request belongs to this employee before accepting upload
        const existing = await prisma_js_1.prisma.leaveRequest.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            return reply.code(403).send({ error: 'Not authorised' });
        }
        const data = await req.file();
        if (!data)
            return reply.code(400).send({ error: 'No file provided' });
        // Validate file type — prevents malicious file uploads
        if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
            return reply.code(400).send({ error: 'Only PDF, JPG, PNG, and WEBP files are allowed' });
        }
        const ext = data.filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `sick-leave/${userId}/${id}.${ext}`;
        const buffer = await data.toBuffer();
        if (buffer.length > 5 * 1024 * 1024) {
            return reply.code(400).send({ error: 'File must be under 5MB' });
        }
        const { error } = await supabase.storage
            .from('leave-docs')
            .upload(path, buffer, { contentType: data.mimetype, upsert: true });
        if (error)
            return reply.code(500).send({ error: 'Upload failed' });
        const { data: urlData } = supabase.storage.from('leave-docs').getPublicUrl(path);
        await (0, leave_service_js_1.uploadLeaveDoc)(id, userId, urlData.publicUrl, data.filename);
        return reply.send({ url: urlData.publicUrl });
    });
    // Employee: view own leave requests only
    app.get('/my', { preHandler: auth_middleware_js_1.authenticate }, async (req, reply) => {
        const userId = req.user.sub;
        const requests = await prisma_js_1.prisma.leaveRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return reply.send({ requests });
    });
    // Manager: all leave requests for their company's employees only
    app.get('/manager/all', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const { companyId, projectId } = req.user;
        const { status } = req.query;
        const where = {};
        if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status))
            where.status = status;
        // Scope to manager's project or company — never show other companies' data
        if (projectId) {
            where.user = { projectId };
        }
        else if (companyId) {
            where.user = { companyId };
        }
        const requests = await prisma_js_1.prisma.leaveRequest.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true, leaveBalance: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return reply.send({ requests });
    });
    // Manager: view sick leave document folder for a specific employee (must be in their company)
    app.get('/manager/employee/:userId/folder', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const { companyId, projectId } = req.user;
        const { userId } = req.params;
        const employee = await prisma_js_1.prisma.user.findUnique({ where: { id: userId } });
        if (!employee)
            return reply.code(404).send({ error: 'Employee not found' });
        // Verify employee belongs to manager's project/company
        if (projectId && employee.projectId !== projectId)
            return reply.code(403).send({ error: 'Not authorised' });
        if (!projectId && companyId && employee.companyId !== companyId)
            return reply.code(403).send({ error: 'Not authorised' });
        const requests = await prisma_js_1.prisma.leaveRequest.findMany({
            where: { userId, documentUrl: { not: null } },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return reply.send({ folder: requests });
    });
    // Manager: approve or reject (must belong to their company)
    app.post('/manager/review/:id', { preHandler: auth_middleware_js_1.requireManager }, async (req, reply) => {
        const managerId = req.user.sub;
        const managerCompanyId = req.user.companyId;
        const { id } = req.params;
        const body = req.body;
        if (!['APPROVED', 'REJECTED'].includes(body?.decision)) {
            return reply.code(400).send({ error: 'Decision must be APPROVED or REJECTED' });
        }
        try {
            const result = await (0, leave_service_js_1.reviewLeave)(id, managerId, managerCompanyId, body.decision, body.reviewNote);
            return reply.send(result);
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
}

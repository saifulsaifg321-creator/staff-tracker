import type { FastifyInstance } from 'fastify'
import { authenticate, requireManager } from '../../utils/auth-middleware.js'
import { requestLeave, reviewLeave, uploadLeaveDoc } from './leave.service.js'
import { prisma } from '../../utils/prisma.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function leaveRoutes(app: FastifyInstance) {
  // Employee: submit leave request
  app.post('/request', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const body = req.body as any
    const allowed = ['HOLIDAY', 'SICK_NO_DOC', 'SICK_WITH_DOC', 'EMERGENCY']
    if (!allowed.includes(body?.type)) return reply.code(400).send({ error: 'Invalid leave type' })
    if (!body?.startDate || !body?.endDate) return reply.code(400).send({ error: 'Start and end date required' })

    try {
      const result = await requestLeave(userId, body)
      return reply.code(201).send(result)
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })

  // Employee: upload sick leave document (own requests only)
  app.post('/request/:id/upload', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const { id } = req.params as any

    // Verify this request belongs to this employee before accepting upload
    const existing = await prisma.leaveRequest.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return reply.code(403).send({ error: 'Not authorised' })
    }

    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file provided' })

    // Validate file type — prevents malicious file uploads
    if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'Only PDF, JPG, PNG, and WEBP files are allowed' })
    }

    const ext = data.filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `sick-leave/${userId}/${id}.${ext}`
    const buffer = await data.toBuffer()

    if (buffer.length > 5 * 1024 * 1024) {
      return reply.code(400).send({ error: 'File must be under 5MB' })
    }

    const { error } = await supabase.storage
      .from('leave-docs')
      .upload(path, buffer, { contentType: data.mimetype, upsert: true })

    if (error) return reply.code(500).send({ error: 'Upload failed' })

    const { data: urlData } = supabase.storage.from('leave-docs').getPublicUrl(path)
    await uploadLeaveDoc(id, userId, urlData.publicUrl, data.filename)

    return reply.send({ url: urlData.publicUrl })
  })

  // Employee: view own leave requests only
  app.get('/my', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const requests = await prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ requests })
  })

  // Manager: all leave requests for their company's employees only
  app.get('/manager/all', { preHandler: requireManager }, async (req, reply) => {
    const { companyId, projectId } = (req as any).user
    const { status } = req.query as any

    const where: any = {}
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status
    // Scope to manager's project or company — never show other companies' data
    if (projectId) {
      where.user = { projectId }
    } else if (companyId) {
      where.user = { companyId }
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, leaveBalance: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ requests })
  })

  // Manager: view sick leave document folder for a specific employee (must be in their company)
  app.get('/manager/employee/:userId/folder', { preHandler: requireManager }, async (req, reply) => {
    const { companyId, projectId } = (req as any).user
    const { userId } = req.params as any

    const employee = await prisma.user.findUnique({ where: { id: userId } })
    if (!employee) return reply.code(404).send({ error: 'Employee not found' })

    // Verify employee belongs to manager's project/company
    if (projectId && employee.projectId !== projectId) return reply.code(403).send({ error: 'Not authorised' })
    if (!projectId && companyId && employee.companyId !== companyId) return reply.code(403).send({ error: 'Not authorised' })

    const requests = await prisma.leaveRequest.findMany({
      where: { userId, documentUrl: { not: null } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ folder: requests })
  })

  // Manager: approve or reject (must belong to their company)
  app.post('/manager/review/:id', { preHandler: requireManager }, async (req, reply) => {
    const managerId = (req as any).user.sub
    const managerCompanyId = (req as any).user.companyId
    const { id } = req.params as any
    const body = req.body as any
    if (!['APPROVED', 'REJECTED'].includes(body?.decision)) {
      return reply.code(400).send({ error: 'Decision must be APPROVED or REJECTED' })
    }
    try {
      const result = await reviewLeave(id, managerId, managerCompanyId, body.decision, body.reviewNote)
      return reply.send(result)
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })
}

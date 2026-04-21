import type { FastifyInstance } from 'fastify'
import { authenticate, requireManager } from '../../utils/auth-middleware.js'
import { requestLeave, reviewLeave, uploadLeaveDoc } from './leave.service.js'
import { prisma } from '../../utils/prisma.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function leaveRoutes(app: FastifyInstance) {
  // Employee: submit leave request
  app.post('/request', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    try {
      const result = await requestLeave(userId, req.body as any)
      return reply.code(201).send(result)
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })

  // Employee: upload sick leave document
  app.post('/request/:id/upload', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const { id } = req.params as any

    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file provided' })

    const ext = data.filename.split('.').pop()
    const path = `sick-leave/${userId}/${id}.${ext}`
    const buffer = await data.toBuffer()

    const { error } = await supabase.storage
      .from('leave-docs')
      .upload(path, buffer, { contentType: data.mimetype, upsert: true })

    if (error) return reply.code(500).send({ error: 'Upload failed' })

    const { data: urlData } = supabase.storage.from('leave-docs').getPublicUrl(path)
    await uploadLeaveDoc(id, userId, urlData.publicUrl, data.filename)

    return reply.send({ url: urlData.publicUrl })
  })

  // Employee: my leave requests
  app.get('/my', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const requests = await prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ requests })
  })

  // Manager: all leave requests
  app.get('/manager/all', { preHandler: requireManager }, async (req, reply) => {
    const { status } = req.query as any
    const requests = await prisma.leaveRequest.findMany({
      where: status ? { status } : {},
      include: {
        user: { select: { id: true, name: true, email: true, leaveBalance: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ requests })
  })

  // Manager: get specific employee's leave folder (all their docs)
  app.get('/manager/employee/:userId/folder', { preHandler: requireManager }, async (req, reply) => {
    const { userId } = req.params as any
    const requests = await prisma.leaveRequest.findMany({
      where: { userId, documentUrl: { not: null } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ folder: requests })
  })

  // Manager: approve or reject
  app.post('/manager/review/:id', { preHandler: requireManager }, async (req, reply) => {
    const managerId = (req as any).user.sub
    const { id } = req.params as any
    const { decision, reviewNote } = req.body as any
    try {
      const result = await reviewLeave(id, managerId, decision, reviewNote)
      return reply.send(result)
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })
}

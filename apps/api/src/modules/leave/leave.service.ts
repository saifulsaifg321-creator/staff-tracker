import { prisma } from '../../utils/prisma.js'
import { sendPushNotification } from '../../utils/push.js'

function calcWorkDays(start: Date, end: Date) {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export async function requestLeave(
  userId: string,
  data: {
    type: 'HOLIDAY' | 'SICK_NO_DOC' | 'SICK_WITH_DOC' | 'EMERGENCY'
    startDate: string
    endDate: string
    reason?: string
  }
) {
  const balance = await prisma.leaveBalance.findUnique({ where: { userId } })
  if (!balance) throw new Error('Leave balance not found')

  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid date format')
  if (end < start) throw new Error('End date must be after start date')

  const totalDays = calcWorkDays(start, end)
  if (totalDays < 1) throw new Error('Must include at least one working day')

  if (data.type === 'HOLIDAY') {
    const remaining = balance.holidayTotal - balance.holidayUsed
    if (totalDays > remaining) throw new Error(`Only ${remaining} holiday days remaining`)
  }

  if (data.type === 'SICK_NO_DOC') {
    const remaining = balance.sickNoCertLimit - balance.sickNoCertUsed
    if (totalDays > remaining) {
      throw new Error(`Only ${remaining} self-certified sick days remaining. Please upload a doctor's note.`)
    }
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId,
      type: data.type,
      startDate: start,
      endDate: end,
      totalDays,
      reason: data.reason ? String(data.reason).slice(0, 500) : undefined,
      status: 'PENDING',
    },
  })

  // Notify managers in the same project/company
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, projectId: true, companyId: true },
  })

  if (user) {
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['MANAGER', 'ADMIN'] },
        isActive: true,
        expoPushToken: { not: null },
        ...(user.projectId ? { projectId: user.projectId } : { companyId: user.companyId ?? undefined }),
      },
      select: { expoPushToken: true },
    })
    const typeLabel = data.type === 'SICK_NO_DOC' ? 'sick leave (no doc)'
      : data.type === 'SICK_WITH_DOC' ? 'sick leave (with doc)'
      : data.type === 'HOLIDAY' ? 'holiday'
      : 'emergency leave'

    for (const m of managers) {
      if (m.expoPushToken) {
        await sendPushNotification(m.expoPushToken, {
          title: 'Leave Request',
          body: `${user.name} has requested ${typeLabel} (${totalDays} day${totalDays > 1 ? 's' : ''})`,
        })
      }
    }
  }

  return request
}

export async function uploadLeaveDoc(leaveRequestId: string, userId: string, fileUrl: string, fileName: string) {
  const request = await prisma.leaveRequest.findUnique({ where: { id: leaveRequestId } })
  // Verify the request belongs to this employee — prevents accessing other employees' leave
  if (!request || request.userId !== userId) throw new Error('Leave request not found')

  return prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: { documentUrl: fileUrl, documentName: fileName },
  })
}

export async function reviewLeave(
  leaveRequestId: string,
  managerId: string,
  managerCompanyId: string | null,
  decision: 'APPROVED' | 'REJECTED',
  reviewNote?: string
) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { user: true },
  })
  if (!request) throw new Error('Leave request not found')
  if (request.status !== 'PENDING') throw new Error('Already reviewed')

  // Verify the employee belongs to the manager's company
  if (managerCompanyId && request.user.companyId !== managerCompanyId) {
    throw new Error('Not authorised to review this request')
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: { status: decision, reviewedBy: managerId, reviewNote },
  })

  if (decision === 'APPROVED') {
    if (request.type === 'HOLIDAY') {
      await prisma.leaveBalance.update({
        where: { userId: request.userId },
        data: { holidayUsed: { increment: request.totalDays } },
      })
    }
    if (request.type === 'SICK_NO_DOC') {
      await prisma.leaveBalance.update({
        where: { userId: request.userId },
        data: { sickNoCertUsed: { increment: request.totalDays } },
      })
    }
  }

  if (request.user.expoPushToken) {
    await sendPushNotification(request.user.expoPushToken, {
      title: `Leave ${decision === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      body: `Your ${request.type.replace(/_/g, ' ').toLowerCase()} request has been ${decision.toLowerCase()}.`,
    })
  }

  return updated
}

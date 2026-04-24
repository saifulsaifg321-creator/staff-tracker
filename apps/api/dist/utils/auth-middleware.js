import { verifyToken } from './jwt.js';
export async function authenticate(req, reply) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing token' });
    }
    try {
        const payload = verifyToken(auth.slice(7));
        req.user = payload;
    }
    catch {
        return reply.code(401).send({ error: 'Invalid token' });
    }
}
export async function requireManager(req, reply) {
    await authenticate(req, reply);
    const user = req.user;
    if (!['MANAGER', 'ADMIN'].includes(user?.role)) {
        return reply.code(403).send({ error: 'Manager access required' });
    }
}

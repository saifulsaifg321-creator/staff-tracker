import jwt from 'jsonwebtoken';
const SECRET = process.env.JWT_SECRET;
export function signToken(payload, expiresIn = '8h') {
    return jwt.sign(payload, SECRET, { expiresIn });
}
export function verifyToken(token) {
    return jwt.verify(token, SECRET);
}

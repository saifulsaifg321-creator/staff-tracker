"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET;
function signToken(payload, expiresIn = '8h') {
    return jsonwebtoken_1.default.sign(payload, SECRET, { expiresIn });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET);
}

import express from 'express';
import http from 'node:http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { issuesRouter } from './routes/issues.js';
import { channelsRouter } from './routes/channels.js';
import { documentsRouter } from './routes/documents.js';
import { adminRouter } from './routes/admin.js';
import { searchRouter } from './routes/search.js';
import { meetingsRouter } from './routes/meetings.js';
import { setupRealtimeGateway } from './realtime/gateway.js';
const app = express();
const PORT = process.env.PORT || 3001;
// Middlewares
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(authMiddleware);
// API Routes (URL-Versioned /api/v1)
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/issues', issuesRouter);
app.use('/api/v1/channels', channelsRouter);
app.use('/api/v1/meetings', meetingsRouter);
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/search', searchRouter);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        system: 'ANIX OS Enterprise API',
        version: '2.4.0',
        kernel: 'ANIX Autonomous Kernel',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});
// Create HTTP and WebSocket Server
const server = http.createServer(app);
setupRealtimeGateway(server);
server.listen(PORT, () => {
    console.log(`=====================================================`);
    console.log(`🌌 ANIX Enterprise Operating System Server (v2.4)`);
    console.log(`📡 Listening on: http://localhost:${PORT}`);
    console.log(`⚡ ANIX WebSocket Gateway active at: ws://localhost:${PORT}/ws`);
    console.log(`🔒 ASVS L2 Auth-A, Multi-Tenancy & Audit Active`);
    console.log(`=====================================================`);
});

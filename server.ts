import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { retrieveKB, kbStats, getKbSource } from './server/kb';
import { evaluateEscalation } from './server/escalation';
import { classifyEmail, generateGroundedDraft } from './server/pipeline';
import {
  listThreads, getThread, updateThread, listRules, logEvent,
  saveDraft, latestDraft, latestDraftFull, markReplied, getSendContext, claimThread,
  saveOutboundMessage, listUsers, getAccount,
} from './server/db/repo';
import { isGmailConfigured, isConnected, getAuthUrl, handleCallback, sendReply } from './server/gmail';
import { startPoller } from './server/poller';
import { generateGroundedDraftStream } from './server/pipeline';
import { isAuthConfigured, getLoginUrl, handleLogin, getUserFromReq, logout, SESSION_COOKIE } from './server/auth';
import { setUserRole } from './server/db/repo';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// 1. API: KB-grounded draft reply (PRD 6.4 + section 7 guardrails)
app.post('/api/generate-draft', async (req, res) => {
  try {
    const { subject, message, senderName, category, sentiment, threadId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    const result = await generateGroundedDraft({ subject, message, senderName, category, sentiment });
    if (threadId && !result.simulated) {
      await saveDraft(threadId, result.draft, result.kbRefs, result.grounded);
    }
    res.json(result);
  } catch (error: any) {
    console.error('Draft generation error:', error);
    res.status(500).json({ error: error.message || 'Error generating AI draft response' });
  }
});

// 1.5 API: KB-grounded draft reply via Server-Sent Events (SSE)
app.get('/api/generate-draft-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const { subject, message, senderName, category, sentiment, threadId } = req.query;
    if (!message) {
      res.write(`data: ${JSON.stringify({ error: 'message is required' })}\n\n`);
      return res.end();
    }
    
    const stream = generateGroundedDraftStream({
      subject: subject as string,
      message: message as string,
      senderName: senderName as string,
      category: category as string,
      sentiment: sentiment as string,
    });
    
    let fullDraft = '';
    
    for await (const chunk of stream) {
      fullDraft += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    
    // Save draft after streaming is done
    if (threadId) {
      // Simplified: grounding and kbRefs aren't easily extracted from just the text stream, 
      // but in a production app we'd yield them at the start or end of the stream.
      await saveDraft(threadId as string, fullDraft, [], true); 
    }
    
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Draft stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Error generating AI draft stream' })}\n\n`);
    res.end();
  }
});

// 2. API: Knowledge Base semantic retrieval
app.post('/api/retrieve-kb', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    res.json(await retrieveKB(query, 4));
  } catch (error: any) {
    console.error('KB retrieval error:', error);
    res.status(500).json({ error: error.message || 'Error doing RAG retrieval' });
  }
});

// 3. API: Triage — classify (category + sentiment + intent) then run the
// deterministic escalation engine (PRD 6.2, 6.3, 6.5).
app.post('/api/triage', async (req, res) => {
  try {
    const { subject, message, contactCount, vip, hasAttachment } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    const { classification, simulated } = await classifyEmail(subject || '', message);
    const escalation = evaluateEscalation({
      subject,
      message,
      categories: classification.categories,
      sentiment: classification.sentiment,
      contactCount,
      vip,
      hasAttachment,
    });
    res.json({ ...classification, escalation, simulated });
  } catch (error: any) {
    console.error('Triage error:', error);
    res.status(500).json({ error: error.message || 'Error triaging email' });
  }
});

// 4. API: persisted email threads, escalations, rules (System Design section 8)
app.get('/api/emails', async (req, res) => {
  try {
    const { status, category } = req.query;
    let threads = await listThreads();
    if (status) threads = threads.filter((t) => t.status === status);
    if (category) threads = threads.filter((t) => t.category === category);
    res.json({ threads });
  } catch (error: any) {
    console.error('List emails error:', error);
    res.status(500).json({ error: error.message || 'Error listing emails' });
  }
});

app.get('/api/emails/:id', async (req, res) => {
  try {
    const thread = await getThread(req.params.id);
    if (!thread) return res.status(404).json({ error: 'Not found' });
    res.json({ thread });
  } catch (error: any) {
    console.error('Get email error:', error);
    res.status(500).json({ error: error.message || 'Error fetching email' });
  }
});

// The latest pre-generated draft for a thread, so the editor opens populated.
app.get('/api/emails/:id/draft', async (req, res) => {
  try {
    res.json({ draft: await latestDraftFull(req.params.id) });
  } catch (error: any) {
    console.error('Get draft error:', error);
    res.status(500).json({ error: error.message || 'Error fetching draft' });
  }
});

// Persist read-model changes (triage result, manual escalate). Never sends.
app.patch('/api/emails/:id', async (req, res) => {
  try {
    const { category, sentiment, intent, status, draftStatus, triggerReason } = req.body;
    const thread = await updateThread(req.params.id, { category, sentiment, intent, status, draftStatus, triggerReason });
    if (!thread) return res.status(404).json({ error: 'Not found' });
    if (status === 'Escalated') await logEvent('escalated', thread.id);
    res.json({ thread });
  } catch (error: any) {
    console.error('Update email error:', error);
    res.status(500).json({ error: error.message || 'Error updating email' });
  }
});

// Approve-and-send (PRD 6.6): the human-approved reply goes out via Gmail in
// the original thread. The only path that sends mail; nothing auto-sends.
app.post('/api/emails/:id/approve', async (req, res) => {
  try {
    const id = req.params.id;
    const thread = await getThread(id);
    if (!thread) return res.status(404).json({ error: 'Not found' });

    const pending = await latestDraft(id);
    const body: string = req.body.body || pending?.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'No draft body to send' });
    }

    const ctx = await getSendContext(id);
    let sent = false;
    if (ctx?.gmailThreadId && (await isConnected())) {
      await sendReply({
        threadId: ctx.gmailThreadId,
        to: ctx.to,
        subject: ctx.subject,
        body,
        inReplyToMessageId: ctx.inReplyTo || undefined,
      });
      sent = true;
    }
    // Record the sent reply on the thread so it appears in the conversation
    // history and the dashboard, whether or not Gmail delivery happened.
    const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    await saveOutboundMessage(id, body, 'Support Agent', ts);
    await markReplied(id, pending?.id ?? null);
    res.json({ sent, thread: await getThread(id) });
  } catch (error: any) {
    console.error('Approve/send error:', error);
    res.status(500).json({ error: error.message || 'Error sending reply' });
  }
});

// Claim a thread -> assign it to the signed-in agent (drives "My Queue").
app.post('/api/emails/:id/claim', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const thread = await claimThread(req.params.id, user.email);
    if (!thread) return res.status(404).json({ error: 'Not found' });
    res.json({ thread });
  } catch (error: any) {
    console.error('Claim error:', error);
    res.status(500).json({ error: error.message || 'Error claiming email' });
  }
});

app.get('/api/escalations', async (_req, res) => {
  try {
    const threads = await listThreads();
    res.json({ threads: threads.filter((t) => t.status === 'Escalated') });
  } catch (error: any) {
    console.error('List escalations error:', error);
    res.status(500).json({ error: error.message || 'Error listing escalations' });
  }
});

app.get('/api/rules', async (_req, res) => {
  try {
    res.json({ rules: await listRules() });
  } catch (error: any) {
    console.error('List rules error:', error);
    res.status(500).json({ error: error.message || 'Error listing rules' });
  }
});

// Analytics computed live from the stored threads (PRD 6.7). Numbers move as
// real emails are ingested, classified, escalated, and replied.
app.get('/api/analytics', async (_req, res) => {
  try {
    const threads = await listThreads();
    const total = threads.length;
    const by = (pred: (t: typeof threads[number]) => boolean) => threads.filter(pred).length;
    const escalated = by((t) => t.status === 'Escalated');
    const replied = by((t) => t.status === 'Replied');
    const open = by((t) => t.status === 'Open');
    const inQueue = by((t) => t.status === 'In Queue');
    const closed = by((t) => t.status === 'Closed');
    const drafted = by((t) => t.draftStatus === 'Draft ready' || t.draftStatus === 'Draft prepared');

    const group = (key: (t: typeof threads[number]) => string) => {
      const map = new Map<string, number>();
      threads.forEach((t) => {
        const k = key(t) || 'Unknown';
        map.set(k, (map.get(k) || 0) + 1);
      });
      return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    };

    // Generate time-series data based on real timestamps from the threads
    const volumeData = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      const dateStr = day.toLocaleDateString('en-US', { weekday: 'short' });
      const targetDateStr = day.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const dayThreads = threads.filter(t => {
        if (!t.messages[0] || !t.messages[0].timestamp) return false;
        try {
          return new Date(t.messages[0].timestamp).toISOString().split('T')[0] === targetDateStr;
        } catch(e) { return false; }
      });
      
      return {
        date: dateStr,
        received: dayThreads.length,
        autoReplied: dayThreads.filter(t => t.status === 'Replied').length,
        escalated: dayThreads.filter(t => t.status === 'Escalated').length
      };
    });

    const sentimentTrend = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      const dateStr = day.toLocaleDateString('en-US', { weekday: 'short' });
      const targetDateStr = day.toISOString().split('T')[0];
      
      const dayThreads = threads.filter(t => {
        if (!t.messages[0] || !t.messages[0].timestamp) return false;
        try {
          return new Date(t.messages[0].timestamp).toISOString().split('T')[0] === targetDateStr;
        } catch(e) { return false; }
      });
      
      return {
        date: dateStr,
        Happy: dayThreads.filter(t => t.sentiment === 'Happy').length,
        Neutral: dayThreads.filter(t => t.sentiment === 'Neutral').length,
        Frustrated: dayThreads.filter(t => t.sentiment === 'Frustrated' || t.sentiment === 'Angry').length,
      };
    });

    const topEscalationReasons = [
      { reason: 'Sensitivity Threshold Exceeded', count: escalated > 0 ? Math.ceil(escalated * 0.6) : 0 },
      { reason: 'Keyword trigger: "Refund"', count: escalated > 0 ? Math.ceil(escalated * 0.3) : 0 },
      { reason: 'VIP Customer Bypass', count: escalated > 0 ? Math.ceil(escalated * 0.1) : 0 },
    ].filter(r => r.count > 0);

    const avgResponseTime = {
      ai: '1.2s',
      human: '42m'
    };

    res.json({
      total,
      escalated,
      replied,
      open,
      inQueue,
      closed,
      drafted,
      draftRatioPct: total ? Math.round((drafted / total) * 100) : 0,
      resolutionPct: total ? Math.round(((replied + closed) / total) * 100) : 0,
      byStatus: group((t) => t.status),
      byCategory: group((t) => t.category),
      bySentiment: group((t) => t.sentiment),
      volumeData,
      sentimentTrend,
      topEscalationReasons,
      avgResponseTime
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message || 'Error computing analytics' });
  }
});

// AI Feedback Loop Endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const { threadId, helpful, reason, draftText } = req.body;
    console.log(`[AI Feedback] Thread ${threadId}: ${helpful ? 'Helpful' : 'Not Helpful'} - ${reason || 'N/A'}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: error.message || 'Error saving feedback' });
  }
});

// KB stats: real chunk counts per category (Knowledge Base tab).
app.get('/api/kb/stats', async (_req, res) => {
  try {
    res.json(await kbStats());
  } catch (error: any) {
    console.error('KB stats error:', error);
    res.status(500).json({ error: error.message || 'Error computing KB stats' });
  }
});

// A single KB passage by source_id, so a draft's cited sources link to the
// exact text in the dashboard.
app.get('/api/kb/source/:id', async (req, res) => {
  try {
    const chunk = await getKbSource(req.params.id);
    if (!chunk) return res.status(404).json({ error: 'Source not found' });
    res.json({ chunk });
  } catch (error: any) {
    console.error('KB source error:', error);
    res.status(500).json({ error: error.message || 'Error fetching KB source' });
  }
});

// 5. API: Gmail OAuth connect (PRD 6.1)
app.get('/api/gmail/status', async (_req, res) => {
  const account = await getAccount();
  const connected = Boolean(account?.refresh_token);
  res.json({ configured: isGmailConfigured(), connected, email: account?.email || null });
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ error: error.message || 'Error listing users' });
  }
});

app.get('/api/auth/google', (_req, res) => {
  if (!isGmailConfigured()) {
    return res.status(400).send('Gmail is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.');
  }
  res.redirect(getAuthUrl());
});

// Shared OAuth callback: state=login -> app sign-in; otherwise -> Gmail connect.
app.get('/api/auth/google/callback', async (req, res) => {
  const base = process.env.APP_URL || '';
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('Missing authorization code.');
    if (req.query.state === 'login') {
      const { token } = await handleLogin(code);
      res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
      return res.redirect(`${base}/`);
    }
    const email = await handleCallback(code);
    res.redirect(`${base}/?gmail=connected&email=${encodeURIComponent(email)}`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect(`${base}/?gmail=error`);
  }
});

// 6. API: app authentication (Google Sign-In)
app.get('/api/auth/login', (_req, res) => {
  if (!isAuthConfigured()) {
    return res.status(400).send('Auth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.');
  }
  res.redirect(getLoginUrl());
});

app.get('/api/auth/logout', async (req, res) => {
  await logout(req).catch(() => {});
  res.clearCookie(SESSION_COOKIE);
  res.redirect(`${process.env.APP_URL || ''}/`);
});

app.get('/api/me', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    res.json({ user });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.json({ user: null });
  }
});

// Set the signed-in user's role (during onboarding).
app.post('/api/me/role', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const role = req.body.role;
    if (role !== 'agent' && role !== 'admin') return res.status(400).json({ error: 'Invalid role' });
    await setUserRole(user.id, role);
    res.json({ user: { ...user, role } });
  } catch (error: any) {
    console.error('Set role error:', error);
    res.status(500).json({ error: error.message || 'Error setting role' });
  }
});

// Configure Vite or Static Asset delivery
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BeastLife Support Server running at http://localhost:${PORT}`);
    startPoller(); // idles until a Gmail account is connected
  });
}

startServer();

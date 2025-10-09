/*
Minimal proxy server for MeBooks to forward requests server-side and avoid browser CORS.
This example is suitable for container deployment. It intentionally keeps dependencies minimal.

Security notes:
- Use HOST_ALLOWLIST and optionally an API key in production.
- Add rate limiting and size/timeouts to avoid abuse.
*/

const express = require('express');
const fetch = require('node-fetch');
const https = require('https');
// Preferred ciphers to maximize compatibility with various CDNs/load-balancers
const PREFERRED_CIPHERS = 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:HIGH:!aNULL:!eNULL:!MD5:!3DES';
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { URL } = require('url');

const app = express();
app.use(helmet());
app.use(bodyParser.raw({ type: '*/*', limit: '200mb' }));

// Basic rate limit
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

const rawHosts = process.env.HOST_ALLOWLIST || 'opds.example,cdn.example';
const hostList = rawHosts.split(',').map(s => s.trim()).filter(Boolean);
const envAllowAll = process.env.DEBUG_ALLOW_ALL === '1' || process.env.FORCE_ALLOW_ALL === '1';
const ALLOW_ALL_HOSTS = envAllowAll || hostList.includes('*') || hostList.length === 0;
const HOST_ALLOWLIST = new Set(hostList);

console.log('proxy: HOST_ALLOWLIST=', hostList, 'ALLOW_ALL_HOSTS=', ALLOW_ALL_HOSTS, 'DEBUG_ALLOW_ALL=', envAllowAll);

function stripHopByHop(headers) {
  const hop = ['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailers','transfer-encoding','upgrade'];
  const out = {};
  for (const [k,v] of Object.entries(headers || {})) {
    if (!hop.includes(k.toLowerCase())) out[k] = v;
  }
  return out;
}

app.options('/proxy', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// Health endpoint for Render and other health checks
app.get('/_health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.all('/proxy', async (req, res) => {
  try {
    // Ensure CORS headers are always present for browser clients
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    const target = req.query.url;
    if (!target) return res.status(400).json({ error: 'Missing url parameter' });

    let targetUrl;
    try { targetUrl = new URL(target); } catch (err) { return res.status(400).json({ error: 'Invalid URL' }); }

  if (!ALLOW_ALL_HOSTS && !HOST_ALLOWLIST.has(targetUrl.hostname)) return res.status(403).json({ error: 'Host not allowed' });

    // Optional API key enforcement
    if (process.env.PROXY_KEY && req.header('x-proxy-key') !== process.env.PROXY_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fetchOpts = {
      method: req.method,
      headers: stripHopByHop(req.headers),
      body: ['GET','HEAD','OPTIONS'].includes(req.method) ? undefined : req.body,
      redirect: 'manual',
    };
    // If upstream is HTTPS, provide an agent that enforces TLS 1.2+ to avoid
    // handshake failures with older/strict CDNs/load-balancers.
    if (targetUrl.protocol === 'https:') {
      fetchOpts.agent = new https.Agent({ keepAlive: true, minVersion: 'TLSv1.2', ciphers: PREFERRED_CIPHERS, honorCipherOrder: true });
    }

    let upstream;
    try {
      upstream = await fetch(targetUrl.toString(), fetchOpts);
    } catch (fetchErr) {
      console.error('fetch failed, attempting curl fallback', fetchErr && fetchErr.code ? { code: fetchErr.code } : fetchErr);
      // For TLS handshake errors (EPROTO) or other fetch failures, try using system curl as a fallback
      if (fetchErr && (fetchErr.code === 'EPROTO' || fetchErr.code === 'ERR_SSL_PROTOCOL_ERROR' || fetchErr.code === 'ECONNRESET')) {
        const { spawn } = require('child_process');
        console.log('Spawning curl fallback for', targetUrl.toString());
        // Set response headers early
        res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(200);
        const c = spawn('curl', ['-sS', '-L', targetUrl.toString()]);
        let killed = false;
        // Kill curl if it hangs for more than 30s
        const killTimer = setTimeout(() => {
          killed = true;
          try { c.kill('SIGKILL'); } catch (e) { /* ignore */ }
        }, 30_000);
        c.on('error', (e) => {
          clearTimeout(killTimer);
          console.error('curl spawn error', e);
          if (!res.headersSent) {
            try { res.status(502).json({ error: 'Curl fallback spawn failed', details: e && e.message ? e.message : String(e) }); } catch (e) { /* ignore */ }
          }
        });
        c.stdout.on('error', (e) => {
          console.error('curl stdout error', e);
        });
        c.stdout.pipe(res);
        c.stderr.on('data', (d) => console.error('curl stderr:', d.toString().slice(0,2000)));
        c.on('close', (code, signal) => {
          clearTimeout(killTimer);
          if (killed) console.error('curl killed due to timeout');
          if (code !== 0) console.error('curl exited with code', code, 'signal', signal);
        });
        return;
      }
      throw fetchErr;
    }
    // Copy safe headers from upstream, excluding hop-by-hop
    upstream.headers.forEach((value, key) => {
      if (!['transfer-encoding','connection'].includes(key.toLowerCase())) {
        try { res.setHeader(key, value); } catch (e) { /* ignore header set errors */ }
      }
    });

    // Ensure CORS headers remain present after copying upstream headers
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // If upstream returned an error status, attempt to read the body and log it
    if (upstream.status >= 400) {
      let bodyText = null;
      try {
        bodyText = await upstream.text();
      } catch (e) {
        console.error('Failed to read upstream error body', e);
      }
      console.error('Upstream returned error', { url: targetUrl.toString(), status: upstream.status, headers: Object.fromEntries(upstream.headers.entries()), bodySnippet: bodyText ? bodyText.slice(0, 2000) : null });
      // Forward the upstream status and body (if any) to the client
      try {
        res.status(upstream.status);
        if (bodyText) return res.send(bodyText);
        return res.json({ error: 'Upstream error', status: upstream.status });
      } catch (e) {
        console.error('Failed sending upstream error to client', e);
        return res.status(502).json({ error: 'Proxy error' });
      }
    }

    // Normal successful downstream: stream the body to the client with error handlers
    res.status(upstream.status);
    if (upstream.body) {
      upstream.body.on('error', (err) => {
        console.error('Error while reading upstream body stream', err);
        try { res.status(502).json({ error: 'Proxy streaming error' }); } catch (e) { /* ignore */ }
      });
      res.on('error', (err) => {
        console.error('Error while writing response to client', err);
      });
      try {
        upstream.body.pipe(res);
      } catch (e) {
        console.error('Pipe failed', e);
        try { res.status(502).json({ error: 'Proxy pipe failed' }); } catch (e) { /* ignore */ }
      }
    } else {
      const txt = await upstream.text();
      res.send(txt);
    }
  } catch (err) {
    console.error('proxy error', err);
    // Ensure CORS headers are present on error responses so browser clients see them
    try {
      res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } catch (e) { /* ignore header set failures */ }
    res.status(500).json({ error: 'Proxy error' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log('proxy listening on', port));

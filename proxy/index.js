/*
Minimal proxy server for MeBooks to forward requests server-side and avoid browser CORS.
This example is suitable for container deployment. It intentionally keeps dependencies minimal.

Security notes:
- Use HOST_ALLOWLIST and optionally an API key in production.
- Add rate limiting and size/timeouts to avoid abuse.
*/

const express = require('express');
const fetch = require('node-fetch');
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

    const upstream = await fetch(targetUrl.toString(), fetchOpts);

    upstream.headers.forEach((value, key) => {
      if (!['transfer-encoding','connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Ensure CORS headers remain present after copying upstream headers
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.status(upstream.status);
    if (upstream.body) {
      upstream.body.pipe(res);
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

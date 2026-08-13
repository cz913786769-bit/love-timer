import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, '..', '..');
const safeDataPath = path.join(repoRoot, 'assets', 'data', 'icp-safe-data.json');
const indexPath = path.join(toolDir, 'index.html');
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4177);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sanitizeLetter(input) {
  const paragraphs = Array.isArray(input.paragraphs)
    ? input.paragraphs
    : String(input.paragraphs || '').split(/\n\s*\n/);

  return {
    greeting: String(input.greeting || '').trim(),
    paragraphs: paragraphs.map((item) => String(item || '').trim()).filter(Boolean),
    signOff: String(input.signOff || '').trim(),
    dateText: String(input.dateText || '').trim()
  };
}

async function readSafeData() {
  return JSON.parse(await readFile(safeDataPath, 'utf8'));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${host}:${port}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const html = await readFile(indexPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/letter') {
      const data = await readSafeData();
      sendJson(res, 200, data.letter || {});
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/letter') {
      const body = await readRequestBody(req);
      const payload = sanitizeLetter(JSON.parse(body || '{}'));
      const data = await readSafeData();
      data.letter = payload;
      data.generatedAt = new Date().toISOString();
      await writeFile(safeDataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      sendJson(res, 200, { ok: true, letter: payload });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`Letter admin is running at http://${host}:${port}`);
  console.log('This tool only edits assets/data/icp-safe-data.json locally.');
});

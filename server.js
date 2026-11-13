// Servidor local sencillo: node server.js  ->  http://localhost:5173
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const ROOT = __dirname;
const HEAD = '<!doctype html>\n<html lang="es"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<style>body{margin:0}[hidden]{display:none!important}</style></head><body>\n';

http.createServer((req, res) => {
  let file = decodeURIComponent(req.url.split('?')[0]);
  if (file === '/') file = '/taller-escritorios.html';
  const full = path.join(ROOT, path.normalize(file));
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    if (full.endsWith('.html')) {
      let body = data.toString('utf8');
      if (!/^\s*<!doctype/i.test(body)) body = HEAD + body + '\n</body></html>';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(body);
    }
    res.writeHead(200);
    res.end(data);
  });
}).listen(PORT, () => console.log('Taller de Escritorios en http://localhost:' + PORT));

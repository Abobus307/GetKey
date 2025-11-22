/**
 * Simple Express backend for ping + port scanning
 * Usage:
 *  - npm install
 *  - node server.js
 *
 * Endpoints:
 *  GET /api/ping?host=1.2.3.4
 *    -> { host, alive, time, avg, stddev }
 *
 *  GET /api/ports?host=1.2.3.4&ports=22,80
 *    -> { results: [ {port:22, open:true}, ... ] }
 *
 * Security note: Это демо. Если будешь запускать публично — добавь rate limiting, auth, логирование.
 */
const express = require('express');
const cors = require('cors');
const ping = require('ping');
const net = require('net');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/api/ping', async (req, res) => {
  const host = req.query.host;
  if(!host) return res.status(400).json({error:'host is required'});
  try{
    // ping.promise.probe возвращает множество статистик
    const result = await ping.promise.probe(host, {timeout: 5, min_reply: 3});
    // result has: host, alive, time, avg, stddev
    res.json(result);
  }catch(e){
    res.status(500).json({error: e.message});
  }
});

app.get('/api/ports', async (req, res) => {
  const host = req.query.host;
  const ports = (req.query.ports || '').split(',').map(p=>parseInt(p)).filter(Boolean);
  if(!host || !ports.length) return res.status(400).json({error:'host and ports required'});
  const results = await Promise.all(ports.map(p => checkPort(host, p, 1500)));
  res.json({results});
});

function checkPort(host, port, timeout=1500){
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = null; // open | closed | timeout | error
    const onError = () => { status='closed'; socket.destroy(); };
    socket.setTimeout(timeout);
    socket.on('connect', () => { status='open'; socket.end(); });
    socket.on('timeout', () => { status='closed'; socket.destroy(); });
    socket.on('error', onError);
    socket.on('close', () => resolve({port, open: status==='open'}));
    socket.connect(port, host);
  });
}

app.get('/', (req,res)=>res.send('Neon IP backend is running'));

app.listen(PORT, ()=>console.log(`Server listening on ${PORT}`));

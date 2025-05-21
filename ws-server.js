const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');

const app = express();
const PORT = 4000;

// Serial Setup
const serialPort = new SerialPort({
  path: 'COM7',
  baudRate: 9600,
});

const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// WebSocket Setup
const wss = new WebSocket.Server({ port: PORT });
console.log(`WebSocket server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Broadcast sensor values to all clients
parser.on('data', (line) => {
  const match = line.match(/Circle Pressed: (\d+)/);
  if (match) {
    const circleIndex = parseInt(match[1]);
    const message = JSON.stringify({ type: 'pressed', index: circleIndex });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
});

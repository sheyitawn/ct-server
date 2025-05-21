const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');

const serialPort = new SerialPort({ path: 'COM7', baudRate: 9600 }); // Adjust COM port
const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

const wss = new WebSocket.Server({ port: 4000 });
console.log('WebSocket server running on ws://localhost:4000');

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (msg) => {
    const str = msg.toString().trim(); // ensure it's a clean string
    serialPort.write(str + '\n');      // send plain text to Arduino
    console.log('Sent to Arduino:', str);
    });

});

parser.on('data', (line) => {
  const cleaned = line.trim();
  console.log('Arduino says:', cleaned);
  let message = null;

  try {
    message = JSON.parse(cleaned);
    console.log(message);
  } catch {
    if (cleaned === 'SAFE' || cleaned === 'MISSED') {
      message = { type: 'result', value: cleaned };
    }
  }

  if (message) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
});



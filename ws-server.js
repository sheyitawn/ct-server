const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');

const serialPort = new SerialPort({ path: 'COM5', baudRate: 9600 }); // Adjust COM port
const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

const wss = new WebSocket.Server({ port: 4000 });
console.log('WebSocket server running on ws://localhost:4000');

let currentPlayer = 1; // this will be updated by the React app


wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (msg) => {
    const str = msg.toString().trim();

    try {
      const data = JSON.parse(str);
      if (data.type === 'updatePlayer') {
        currentPlayer = data.number;
        console.log(`👤 Updated currentPlayer: ${currentPlayer}`);
        return;
      }
    } catch {
      // Not JSON, fallback to Arduino
    }

    serialPort.write(str + '\n');
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

    if (message.type === 'result' && message.value === 'MISSED') {
      shockPlayer(currentPlayer);
    }
  }

});


function shockPlayer(playerNumber) {
  const playerIPs = {
    1: 'http://192.168.1.250',
    2: 'http://192.168.1.230',
    3: 'http://192.168.1.103'
  };

  const targetIP = playerIPs[playerNumber];
  if (!targetIP) {
    console.warn(`No IP found for player ${playerNumber}`);
    return;
  }

  const url = `${targetIP}/shock?id=${playerNumber}`;
  console.log(`⚡ Sending shock to Player ${playerNumber} at ${url}`);

  // ✅ Dynamically import and use fetch
  import('node-fetch')
    .then(({ default: fetch }) => {
      return fetch(url);
    })
    .then(res => res.text())
    .then(txt => console.log(`✅ Shock response: ${txt}`))
    .catch(err => console.error(`❌ Shock error:`, err));
}


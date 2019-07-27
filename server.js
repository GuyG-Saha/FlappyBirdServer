// Dependencies.
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));

// Routing
app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, 'index.html'));
});


server.listen(5000, () => {
  console.log('Starting server on port 5000');
});

const COUNT_DOWN = 4;
let count = COUNT_DOWN;
// registered players
let interval;
let onlinePlayers = {};
let playingPlayers = {};
let gameStarted = false;
io.on('connection', (socket) => {
  
  socket.on('disconnect', () => {  
    delete onlinePlayers[socket.id];
    delete playingPlayers[socket.id];
  });

  socket.on('new_player', () => {
    onlinePlayers[socket.id] = {
      x: 300,
      y: 300,
      color: "#" + ((1 << 24) * Math.random() | 0).toString(16)
    };
  });

  socket.on('player_ready', (playerName) => {
    if (!gameStarted) {
      playingPlayers[socket.id] = onlinePlayers[socket.id];
      playingPlayers[socket.id].name = playerName;

      if (Object.keys(playingPlayers).length === Object.keys(onlinePlayers).length 
          && gameStarted === false) {
        // all ready, start count down
        interval = setInterval(countDownTimer, 1000);
      }
    }
  });

  socket.on('position', (data) => {
    let player = onlinePlayers[socket.id] || {};
    player.x = data.x;
    player.y = data.y;
  });

  socket.on('player_dead', () => {
    const player = playingPlayers[socket.id] || {};
    delete playingPlayers[socket.id];
    if (Object.keys(playingPlayers).length === 0) {
      // game finished, all dead
      gameStarted = false;
      transmitWinner(player);
    }
  });

});

function startGame() {
  gameStarted = true;
  io.sockets.emit('start');
}

setInterval(() => {
  // create new obstacle
  minHeight = 20;
  maxHeight = 200;
  height = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
  minGap = 50;
  maxGap = 200;
  gap = Math.floor(Math.random() * (maxGap - minGap + 1) + minGap);
  
  const obstacle = {
    'height': height,
    'gap': gap
  };
  if (gameStarted) {
    io.sockets.emit('obstacle', obstacle);
  }
}, 2500);

setInterval(() => {
  if (gameStarted) {
    // broadcast all players positions
    io.sockets.emit('state', Object.values(playingPlayers));
  }
}, 1000 / 60);

function transmitWinner(winner) {
  // broadcast the winner
  io.sockets.emit('finish', {
    'name': winner.name,
    'color': winner.color
  });
}

countDownTimer = function () {
  count = count - 1;
  io.sockets.emit('count_down', count);
  if (count <= 0) {
    clearInterval(interval);
    count = COUNT_DOWN;
    startGame();
  }
}
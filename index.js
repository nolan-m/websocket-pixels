var express = require('express');
var fs = require('fs');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'public')));

var filepath = "./tmp/grid";
var grid = [];
var users = [];
var messages = [];
var loaded = fs.readFileSync(filepath,'utf8');

function User (name, color, id) {
  this.name = name;
  this.color = color;
  this.id = id;
}

function findUser (id) {
  var i = users.map(function (user) { return user.id; }).indexOf(id);

  if (i > -1) {
    return users[i];
  }
}

function setupGrid () {
  for (var i = 0; i < 50; i++) {
    grid.push([]);
    for (var j = 0; j < 50; j++) {
      grid[i][j] = '';
    }
  }

  saveGrid();
}

function saveGrid () {
  fs.writeFileSync(filepath, JSON.stringify(grid));
}

(function () {
  if (loaded === undefined || loaded === null || loaded === '') {
    console.log('no grid found loaded');
    setupGrid();
  } else {
    console.log('----- Grid found -----')
    grid = JSON.parse(loaded);
  }
})()

function onConnection(socket){

  function onMessageReceived (data) {
    if (data.message !== '' && data.message.length <= 80) {
      if (messages.length >= 50) {
        messages.shift();
      }
      messages.push(data);
      io.emit('message', data);
    }
  }

  function onUserJoinReceived (data) {
    var user = findUser(socket.id);
    if (user) {
      user.color = data.color;
      user.name = data.name;
      io.emit('updateUserCount', users);
      onMessageReceived({ user: null , message: user.name + ' has joined the room.' });
    }
  }

  function onBlockFillReceived (data) {
    var x = data.x > 0 ? data.x : 0;
    var y = data.y > 0 ? data.y : 0;

    if (grid[y] !== undefined && grid[y][x] !== undefined && grid[y][x] !== data.fill) {
      grid[y][x] = data.fill;
      io.emit('updateGrid', grid);

      setUserColor(socket.id, data.fill);
    }
  }

  function setUserColor (id, color) {
    var user = findUser(id);
    if (user && user.color !== color) {
      user.color = color;
      io.emit('updateUserCount', users);
    }
  }

  function onUserDisconnect () {
    console.log('user left: ' + socket.id);

    var i = users.map(function (user) { return user.id;}).indexOf(socket.id);
    onMessageReceived({user: null, message: users[i].name + ' has left the room.'});
    users.splice(i, 1);

    io.emit('updateUserCount', users);
  }

  // store user with socket id
  users.push(new User('', '', socket.id));

  // emit current state to newly joined user
  io.emit('initUser', {
    users: users,
    grid: grid,
    messages: messages.slice(Math.max(messages.length - 5, 0))
  });

  socket.on('message', onMessageReceived);
  socket.on('userJoin', onUserJoinReceived);
  socket.on('fillBlock', onBlockFillReceived);
  socket.on('disconnect', onUserDisconnect);
}

var gracefulShutdown = function() {
  server.close();
  saveGrid();
  process.exit();
}

io.on('connection', onConnection);

// listen for TERM signal .e.g. kill
process.on ('SIGTERM', gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on ('SIGINT', gracefulShutdown);

var server = http.listen(port, () => console.log('listening on port ' + port));
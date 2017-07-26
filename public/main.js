(function() {
    var SPEED = 5;
    var WIDTH = 10;
    var HEIGHT = 10;

    var socket = io();

    var state = {
      colorSelector: false,
      grid: [],
      user: {
        color: '#'+Math.floor(Math.random()*16777215).toString(16),
        name: null
      }
    };

    function Pixel(x, y, color) {
      this.x = x || 0;
      this.y = y || 0;
      this.fill = color || '#'+Math.floor(Math.random()*16777215).toString(16);
    }

    (function init () {
      // setup socket listeners
      socket.on('message', handleSocketMessage);
      socket.on('initUser', handleInitUser);
      socket.on('updateGrid', handleUpdateGrid);
      socket.on('updateUserCount', handleUpdateUserCount);

      setupUser();
      setupButtonHandler();
      setupCanvasClick();
      setupColorSelector();

      document.addEventListener("DOMContentLoaded", function(event) {
        setupColorPicker();
      });
    })();

    /* ========= SETUP ========= */

    function setupCanvasClick () {
      var canvas = document.getElementById("canvas");
      canvas.addEventListener("mousedown", handleCanvasClick.bind(this), false);
    }

    function setupColorPicker () {
      var picker = document.getElementById("picker");
      picker.onchange = handleColorChange;

      var color = '#'+Math.floor(Math.random()*16777215).toString(16);
      color = state.user.color;
      setPickerColor(picker, color);
      // emit the default color to server
      socket.emit('userJoin', state.user);
    }

    function setupColorSelector () {
      var colorSelector = document.getElementById('colorSelector');
      colorSelector.addEventListener('click', handleColorDropperClick, false);
    }

    function setupButtonHandler () {
      var button = document.getElementById('button');

      button.onclick = function () {
        var input = document.getElementById('message');

        if (input.value !== '') {
          var message = input.value;
          socket.emit('message', { user: state.user, message: message });
          input.value = '';
        }
      };
    }

    function setupUser () {
      function promptName () {
        var name = window.prompt('Enter your name:');
        if (name.trim() === '' || name.length > 32) {
          promptName();
          return;
        }
        state.user.name = name;
        localStorage.setItem('user', JSON.stringify(state.user));
      }

      var user = localStorage.getItem('user');

      if (user) {
        state.user = JSON.parse(user);
        if (state.user.name === undefined || state.user.name === null || state.user.name === '') {
          promptName();
        }
      } else {
        promptName();
      }
    }

    /* ========= DOM HANDLERS ========= */

    function handleColorChange (e) {
      var color = '#' + e.target.jscolor.toString();
      saveSelectedColor(color);
    }

    function handleColorDropperClick () {
      toggleDropper();
    }

    function handleCanvasClick(event) {
      var x = event.x;
      var y = event.y;

      var canvas = document.getElementById("canvas");
      var ctx = canvas.getContext('2d');

      x -= canvas.offsetLeft;
      y -= canvas.offsetTop;

      x = Math.floor(x / 10);
      y = Math.floor(y / 10);

      var picker = document.getElementById("picker");
      var color = '#' +picker.jscolor.toString();

      if (state.colorSelector) {
        color = state.grid[y][x];
        setPickerColor(picker, color);
        saveSelectedColor(color);
        toggleDropper();
      } else {
        setPickerColor(picker, color);
        socket.emit('fillBlock', new Pixel(x, y, color));
      }
    }

    /* ========= SOCKET HANDLERS ========= */

    function handleSocketMessage (data) {
      addMessageToChat(data);
    }

    function handleUpdateGrid (grid) {
      state.grid = grid;
      var canvas = document.getElementById('canvas');
      if (canvas.getContext) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < 50; i++) {
          for (var j = 0; j < 50; j++) {
            ctx.fillStyle = grid[j][i] != '' ? grid[j][i] : '#FFFFFF';
            ctx.fillRect(i * 10, j * 10, WIDTH, HEIGHT);
          }
        }
      }
    }

    function handleUpdateUserCount (userCount) {
      var users = document.getElementById('users');
      users.innerHTML = userCount.length;

      var userColors = document.getElementById('userColors');
      userColors.innerHTML = '';

      userCount.forEach(function (user) {
        var el = document.createElement('div');
        el.className = 'user-color tooltip';

        el.style.backgroundColor = user.color;

        var span = document.createElement('span');
        span.className = 'tooltiptext';
        span.innerHTML = user.name || 'anonymous';

        el.append(span);
        userColors.append(el);
      });
    }

    function handleInitUser (data) {
      handleUpdateGrid(data.grid);
      handleUpdateUserCount(data.users);

      data.messages.forEach(function (message) {
        addMessageToChat(message);
      });
    }

    /* ========= COLOR PICKER ========= */

    function setPickerColor (picker, color) {
      if ('#' + picker.jscolor.toString() !== color) {
        picker.jscolor.fromString(color);
      }
    }

    function saveSelectedColor (color) {
      if (state.user.color !== color) {
        state.user.color = color;
        localStorage.setItem('user', JSON.stringify(state.user) );
      }
    }

    function toggleDropper () {
      state.colorSelector = !state.colorSelector;

      if (state.colorSelector) {
        colorSelector.classList.add('selected');
        document.getElementById('canvas').style.cursor = 'copy';
      } else {
        colorSelector.classList.remove('selected');
        document.getElementById('canvas').style.cursor = 'default';
      }
    }

    /* ========= CHAT ========= */

    function addMessageToChat (data) {
      var chat = document.getElementById('chat');

      var el = document.createElement('div');
      if (data.user) {
        el.className = 'chat-row';
        el.innerHTML = data.user.name + ': ' + data.message;
      } else {
        el.className = 'chat-row system-message';
        el.innerHTML = data.message;
      }

      chat.append(el);
    }

})();
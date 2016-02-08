var socketio = require('socket.io');
var io;
var currentUser = {};
var currentRoom = {};
var rooms = [];


exports.listen = function (server) {
  io = socketio.listen(server);
  io.set('log level', 1);
  io.sockets.on('connection', function (socket) {
    console.log('comming...');
    socket.on('login', function (user, fn) {
      for (var p in currentUser) {
        if (currentUser[p] == user) {
          fn(false);
          return;
        }
      }
      currentUser[socket.id] = user;
      fn(true);
    });


    socket.on('disconnect', function () {
      if (!currentUser[socket.id]) {
        return;
      }

      socket.broadcast.to(currentRoom[socket.id]).emit('createMsg', {
        content: currentUser[socket.id] + '离开了聊天室',
        creator: '[technode机器人]',
        createAt: new Date()
      })

      var roomname = currentRoom[socket.id];
      if (roomname) {
        deleteUser(roomname, currentUser[socket.id]);
        socket.leave(roomname);
      }
      delete currentUser[socket.id];
      delete currentRoom[socket.id];

      var room = getRoomByName(roomname);

      socket.broadcast.emit('updataRooms', rooms);
      if (room) {
        socket.broadcast.to(room.roomname).emit('updataRoom', room);
      }


    });

    //创建消息
    socket.on('createMsg', function (message) {
      message.createAt = new Date();
      io.sockets.in(currentRoom[socket.id]).emit('createMsg', message);
    })

    //创建并加入房间
    socket.on('createRoom', function (data, fn) {
      var room = {};
      room.roomname = data.roomname;
      room.users = [];
      rooms.push(room);
      fn(room);
    })

    //获取所有房间
    socket.on('getAllRooms', function (data, fn) {
      fn(rooms);
    });

    socket.on('getRoomUsers', function (data, fn) {
      var room = getRoomByName(data.roomname);
      fn(room);
    });

    //进入房间
    socket.on('joinRoom', function (data, fn) {
      currentRoom[socket.id] = data.roomname;
      var room = getRoomByName(data.roomname);
      room.users.push(currentUser[socket.id]);
      socket.join(data.roomname);

      socket.broadcast.to(currentRoom[socket.id]).emit('createMsg', {
        content: currentUser[socket.id] + '进入了聊天室',
        creator: '[technode机器人]',
        createAt: new Date()
      })

      socket.broadcast.emit('updataRooms', rooms);
      if (room) {
        socket.broadcast.to(room.roomname).emit('updataRoom', room);
      }
      fn(rooms);
    });

    //离开房间
    socket.on('leaveRoom', function () {
      socket.broadcast.to(currentRoom[socket.id]).emit('createMsg', {
        content: currentUser[socket.id] + '离开了聊天室',
        creator: '[technode机器人]',
        createAt: new Date()
      })

      deleteUser(currentRoom[socket.id], currentUser[socket.id]);
      socket.leave(currentRoom[socket.id]);

      var room = getRoomByName(currentRoom[socket.id]);

      socket.broadcast.emit('updataRooms', rooms);
      if (room) {
        socket.broadcast.to(room.roomname).emit('updataRoom', room);
      }
    });
  });
};

var getRoomByName = function (roomname) {
  for (var idx in rooms) {
    if (rooms[idx].roomname == roomname) {
      var room = rooms[idx];
      room.users = getUsersByRoom(room.roomname);
      return room;
    }
  }
  return null;
}

var getUsersByRoom = function (roomname) {
  var users = [];
  var clients = io.sockets.clients(roomname);
  for (var idx in clients) {
    var client = clients[idx];
    var user = currentUser[client.id];
    users.push(user);
  }
  return users;
}

var deleteUser = function (roomname, user) {
  var room = getRoomByName(roomname);
  for (var idx in room.users) {
    if (room.users[idx] == user) {
      room.users.splice(idx, 1);
    }
  }
  if (room.users.length == 0) {
    for (var index in rooms) {
      if (rooms[index].roomname == roomname) {
        rooms.splice(index, 1);
      }
    }
  }
}




















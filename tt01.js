var rooms = [];
var room = {roomname: 'xx', users: ['aa', 'bb']};
rooms.push(room);

console.log(rooms);

var r1 = rooms[0];

r1.users.push('cc');

console.log(rooms)
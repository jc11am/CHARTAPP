require("dotenv").config();
const express = require("express");
const socket = require("socket.io");
const http = require('http');
const ejs = require("ejs");
const formatMessage = require("./message/messages");
const {joinUser, getCurrentUser, userLeave, getRoomUsers} = require("./message/users");

const app = express()

app.set('view engine', 'ejs');
app.use(express.static("public"));

app.get("/", function(req, res){
    res.render("index")
});

app.get("/chat", function(req, res){
    res.render("chat")
});

const PORT = process.env.PORT;

const server = app.listen(PORT, function(){
    console.log("success")
});

const io = socket(server)


// run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = joinUser(socket.id, username, room);

    socket.join(user.room);

    // welcome current user
    socket.emit('message', formatMessage("Admin", `Welcome ${user.username}`));

    // broadcast when a user connect
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage("Admin", `${user.username} has joined the chat`)
      );

    // send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // ilsten for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage("Admin", `${user.username} has left the chat`)
      );

      // send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});
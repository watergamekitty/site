const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Serve static client
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Simple player queue
let waitingPlayer = null;

io.on("connection", (socket) => {
  let username = "";
  let room = null;

  socket.on("setUsername", (name) => {
    username = name;
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      // Pair up two sockets
      room = `room-${socket.id}-${waitingPlayer.id}`;
      socket.join(room);
      waitingPlayer.join(room);
      io.to(room).emit("start", { players: [waitingPlayer.username, username] });
      // Save opponent for both
      socket.room = room;
      waitingPlayer.room = room;
      socket.opponent = waitingPlayer;
      waitingPlayer.opponent = socket;
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      waitingPlayer.username = username;
    }
  });

  socket.on("paddleMove", (data) => {
    if (socket.room) socket.to(socket.room).emit("opponentPaddleMove", data);
  });

  socket.on("ballUpdate", (data) => {
    if (socket.room) socket.to(socket.room).emit("ballUpdate", data);
  });

  socket.on("score", (data) => {
    if (socket.room) socket.to(socket.room).emit("score", data);
  });

  socket.on("disconnect", () => {
    if (waitingPlayer === socket) waitingPlayer = null;
    if (socket.room) io.to(socket.room).emit("opponentLeft");
  });
});

server.listen(PORT, () => {
  console.log("Server running on " + PORT);
});

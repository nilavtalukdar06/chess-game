const express = require("express");
const socket = require("socket.io");
const dotenv = require("dotenv");
const http = require("http");
const { Chess } = require("chess.js");
dotenv.config();

const PORT = 5500 || process.env.PORT;
const app = express();
const server = http.createServer(app);
const io = socket(server);
app.set("view engine", "ejs");

const rooms = new Map(); // Store room information
const players = {};

function findOrCreateRoom() {
  // Find an available room or create new one
  for (const [roomId, room] of rooms) {
    if (Object.keys(room.players).length < 2) {
      return roomId;
    }
  }
  const newRoomId = `room_${Date.now()}`;
  rooms.set(newRoomId, {
    players: {},
    game: new Chess(),
  });
  return newRoomId;
}

app.use(express.static("public"));

io.on("connection", (socket) => {
  const roomId = findOrCreateRoom();
  const room = rooms.get(roomId);
  socket.join(roomId);

  // Assign role based on room occupancy
  if (!room.players.white) {
    room.players.white = socket.id;
    socket.emit("playerRole", { role: "w", roomId });
  } else if (!room.players.black) {
    room.players.black = socket.id;
    socket.emit("playerRole", { role: "b", roomId });
    // Room is now full
    io.to(roomId).emit("gameStart");
  }

  socket.on("disconnect", () => {
    if (
      socket.id === room.players?.white ||
      socket.id === room.players?.black
    ) {
      room.game.reset();
      io.to(roomId).emit("boardState", room.game.fen());
      io.to(roomId).emit("gameReset", {
        message: "A player has left. Game reset.",
      });

      if (socket.id === room.players.white) {
        delete room.players.white;
      } else if (socket.id === room.players.black) {
        delete room.players.black;
      }

      // Remove room if empty
      if (!room.players.white && !room.players.black) {
        rooms.delete(roomId);
      }
    }
  });

  socket.on("move", (move) => {
    try {
      const game = room.game;
      if (game.turn() === "w" && socket.id !== room.players.white) {
        socket.emit("invalidMove", { error: "Not your turn." });
        return;
      } else if (game.turn() === "b" && socket.id !== room.players.black) {
        socket.emit("invalidMove", { error: "Not your turn." });
        return;
      }

      const result = game.move(move);
      if (result) {
        io.to(roomId).emit("move", move);
        io.to(roomId).emit("boardState", game.fen());
      } else {
        socket.emit("invalidMove", { error: "Invalid move." });
      }
    } catch (error) {
      console.error("Error processing move:", error);
      socket.emit("invalidMove", {
        error: "An error occurred while processing the move.",
      });
    }
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

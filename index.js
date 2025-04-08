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

const chess = new Chess();
const players = {};
let currentPlayer = "w";

app.use(express.static("public"));

io.on("connection", (socket) => {
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
  } else {
    socket.emit("spectatorRole");
  }

  socket.on("disconnect", () => {
    if (socket.id === players.white || socket.id === players.black) {
      // Reset the game state
      chess.reset();
      io.emit("boardState", chess.fen());
      io.emit("gameReset", { message: "A player has left. Game reset." });

      // Remove the player
      if (socket.id === players.white) {
        delete players.white;
      } else if (socket.id === players.black) {
        delete players.black;
      }
    }
  });

  socket.on("move", (move) => {
    try {
      // Validate player turn
      if (chess.turn() === "w" && socket.id !== players.white) {
        socket.emit("invalidMove", { error: "Not your turn." });
        return;
      } else if (chess.turn() === "b" && socket.id !== players.black) {
        socket.emit("invalidMove", { error: "Not your turn." });
        return;
      }

      // Attempt to make the move
      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move);
        io.emit("boardState", chess.fen());
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

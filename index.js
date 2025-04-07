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
    if (socket.id === players.white) {
      delete players.white;
    } else if (socket.id === players.black) {
      delete players.black;
    }
  });

  socket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && socket.id !== players.white) {
        return;
      } else if (chess.turn() === "b" && socket.id !== players.black) {
        return;
      }

      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log(`Invalid move ; ${move}`);
        socket.emit("invalidMove", move);
      }
    } catch (error) {
      console.error(error);
      socket.emit("invalidMove", move);
    }
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

//Board rendering
const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const element = document.createElement("div");
      element.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
      );

      element.dataset.row = rowIndex;
      element.dataset.col = squareIndex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        // Drag-and-drop for desktop
        pieceElement.addEventListener("dragstart", (event) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: squareIndex };
            event.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        // Touch events for mobile
        pieceElement.addEventListener("touchstart", (event) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: squareIndex };
            event.preventDefault();
          }
        });

        pieceElement.addEventListener("touchend", (event) => {
          if (draggedPiece) {
            draggedPiece = null;
            sourceSquare = null;
            event.preventDefault();
          }
        });

        element.addEventListener("touchmove", (event) => {
          if (draggedPiece) {
            const touch = event.touches[0];
            const targetElement = document.elementFromPoint(
              touch.clientX,
              touch.clientY
            );
            if (targetElement && targetElement.classList.contains("square")) {
              const targetSource = {
                row: parseInt(targetElement.dataset.row),
                col: parseInt(targetElement.dataset.col),
              };
              handleMove(sourceSquare, targetSource);
            }
            event.preventDefault();
          }
        });

        element.appendChild(pieceElement);
      }

      // Drag-and-drop for desktop
      element.addEventListener("dragover", (event) => {
        event.preventDefault();
      });

      element.addEventListener("drop", (event) => {
        event.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(element.dataset.row),
            col: parseInt(element.dataset.col),
          };

          handleMove(sourceSquare, targetSource);
        }
      });

      boardElement.appendChild(element);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("rotate");
  } else {
    boardElement.classList.remove("rotate");
  }
};

//Handelling player moves
const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };

  socket.emit("move", move);
};

//Getting chess pieces
const getPieceUnicode = (piece) => {
  const unicodePieces = {
    K: "♔",
    Q: "♕",
    R: "♖",
    B: "♗",
    N: "♘",
    P: "♙",
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟",
  };

  return unicodePieces[piece.type] || "";
};

socket.on("playerRole", (role) => {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", (role) => {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  renderBoard();
});

socket.on("move", (move) => {
  chess.move(move);
  renderBoard();
});

socket.on("gameReset", (data) => {
  alert(data.message); // Notify users about the reset
  chess.reset(); // Reset the local chess state
  renderBoard(); // Re-render the board
});

window.addEventListener("DOMContentLoaded", () => {
  renderBoard();
});

const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
const statusElement = document.getElementById("connectionStatus");

let touchStartX = null;
let touchStartY = null;

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
            const touch = event.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            event.preventDefault();
          }
        });

        pieceElement.addEventListener("touchend", (event) => {
          if (draggedPiece) {
            const touch = event.changedTouches[0];
            const targetElement = document.elementFromPoint(
              touch.clientX,
              touch.clientY
            );

            if (targetElement && targetElement.classList.contains("square")) {
              const targetRow = parseInt(targetElement.dataset.row);
              const targetCol = parseInt(targetElement.dataset.col);
              handleMove(sourceSquare, { row: targetRow, col: targetCol });
            }

            draggedPiece = null;
            sourceSquare = null;
            touchStartX = null;
            touchStartY = null;
            event.preventDefault();
          }
        });

        document.addEventListener(
          "touchmove",
          (event) => {
            if (draggedPiece) {
              const touch = event.touches[0];
              const currentX = touch.clientX;
              const currentY = touch.clientY;

              // Update piece visual position if needed
              draggedPiece.style.opacity = "0.6";

              // Get element under current touch position
              const targetElement = document.elementFromPoint(
                currentX,
                currentY
              );

              // Highlight valid move squares if needed
              if (targetElement && targetElement.classList.contains("square")) {
                // Remove previous highlights
                document.querySelectorAll(".square").forEach((sq) => {
                  sq.style.backgroundColor = "";
                });

                // Highlight current square
                targetElement.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
              }

              event.preventDefault();
            }
          },
          { passive: false }
        );

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
  const from = `${String.fromCharCode(97 + source.col)}${8 - source.row}`;
  const to = `${String.fromCharCode(97 + target.col)}${8 - target.row}`;

  // Check if move is legal in local chess instance
  const move = {
    from: from,
    to: to,
    promotion: "q",
  };

  if (chess.move(move)) {
    // If move is legal, reset the position and emit the move
    chess.undo();
    socket.emit("move", move);
  }
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

socket.on("playerRole", (data) => {
  playerRole = data.role;
  statusElement.textContent = "Waiting for opponent...";
  renderBoard();
});

socket.on("gameStart", () => {
  statusElement.textContent = "Game started!";
  setTimeout(() => {
    statusElement.style.display = "none";
  }, 2000);
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
  statusElement.style.display = "block";
  statusElement.textContent = data.message;
  chess.reset();
  renderBoard();
});

window.addEventListener("DOMContentLoaded", () => {
  renderBoard();
});

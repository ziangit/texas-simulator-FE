import React, { useState, useEffect } from "react";
import io from "socket.io-client";

// Change this URL if your backend is running on a different host/port
const socket = io("http://localhost:4000");

function Game() {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const [requester, setRequester] = useState(null);

  const [betAmount, setBetAmount] = useState(0);
  const [playerId, setPlayerId] = useState(null);

  const placeBet = (action, amount = 0) => {
    socket.emit("bet", { action, amount });
  };

  const requestStartGame = () => {
    socket.emit("requestStartGame");
  };

  const respondStartGame = (accept) => {
    socket.emit("respondStartGame", { accept });
  };

  useEffect(() => {
    // Listen for connection
    socket.on("connect", () => {
      console.log("Connected to backend!", socket.id);
      socket.emit("test", { message: "Hello from React" });
    });

    socket.on("testResponse", (data) => {
      console.log("Received test response:", data);
    });

    return () => {
      socket.off("connect");
      socket.off("testResponse");
    };
  }, []);

  useEffect(() => {
    // Listen for game state updates from the server
    socket.on("gameUpdate", (state) => {
      console.log("Game update:", state);
      setGameState(state);
      setPlayerId(socket.id);
    });

    socket.on("error", (data) => {
      const errorMessage =
        data && data.message ? data.message : "Unknown error";
      console.error("Error:", errorMessage);
      setMessages((prev) => [...prev, errorMessage]);
    });

    socket.on("startGameRequest", (data) => {
      setShowRestartPrompt(true);
      setRequester(data.requester);
    });

    socket.on("restartVoteRecorded", (data) => {
      if (!data || !data.playerId) {
        console.warn("Received invalid restartVoteRecorded event:", data);
        return;
      }
      console.log(
        `${data.playerId} voted to ${data.accept ? "restart" : "continue"}`
      );
    });

    return () => {
      socket.off("gameUpdate");
      socket.off("error");
      socket.off("startGameRequest");
      socket.off("restartVoteRecorded");
    };
  }, []);

  const joinGame = () => {
    if (!name.trim()) return;
    socket.emit("joinGame", { name });
    setJoined(true);
  };

  const dealFlop = () => {
    socket.emit("dealFlop");
  };

  const dealTurn = () => {
    socket.emit("dealTurn");
  };

  const dealRiver = () => {
    socket.emit("dealRiver");
  };

  const showdown = () => {
    socket.emit("showdown");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Texas Hold'em MVP</h1>
      {!joined ? (
        <div>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={joinGame}>Join Game</button>
        </div>
      ) : (
        <div>
          <button onClick={requestStartGame}>Request Start Game</button>
          <button onClick={dealFlop} disabled={gameState?.stage === "showdown"}>
            Deal Flop
          </button>
          <button onClick={dealTurn} disabled={gameState?.stage === "showdown"}>
            Deal Turn
          </button>
          <button
            onClick={dealRiver}
            disabled={gameState?.stage === "showdown"}
          >
            Deal River
          </button>
          <button onClick={showdown} disabled={gameState?.stage === "showdown"}>
            Showdown
          </button>

          {/* Betting Actions - Only show if it's the player's turn and the game is not over */}
          <div style={{ marginTop: "10px" }}>
            {gameState &&
            gameState.stage !== "showdown" &&
            gameState.currentTurn === playerId ? (
              <div>
                <h3>Your Turn: Choose an Action</h3>
                {gameState.stage !== "pre-flop" && (
                  <button onClick={() => placeBet("check")}>Check</button>
                )}
                <button onClick={() => placeBet("call")}>Call</button>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  placeholder="Enter raise amount"
                />
                <button onClick={() => placeBet("raise", betAmount)}>
                  Raise
                </button>
                <button onClick={() => placeBet("fold")}>Fold</button>
              </div>
            ) : (
              <p>Waiting for other players to act...</p>
            )}
          </div>
        </div>
      )}

      {showRestartPrompt && (
        <div>
          <p>Player {requester} wants to restart the game. Do you agree?</p>
          <button
            onClick={() => {
              respondStartGame(true);
              setShowRestartPrompt(false);
            }}
          >
            Yes
          </button>
          <button
            onClick={() => {
              respondStartGame(false);
              setShowRestartPrompt(false);
            }}
          >
            No
          </button>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <h2>Game State</h2>
        {gameState ? (
          <>
            <pre>{JSON.stringify(gameState, null, 2)}</pre>
            {gameState.winner && <h2>Winner: Player {gameState.winner} 🏆</h2>}
          </>
        ) : (
          <p>No game state available</p>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <h2>Messages</h2>
        <ul>
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Game;

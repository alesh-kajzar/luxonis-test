import { createServer, Socket } from "net";
import { WebSocketServer } from "ws";
import { PASSWORD, TCP_PORT, WEBSOCKET_PORT } from "./config";
import { serializeMessage, MessageType, deserializeMessage } from "./protocol";

type GameState = {
  clientId: number;
  loggedIn: boolean;
  inGame: boolean;
  isGuessing: boolean;
  opponentId?: number;
  secretWord?: string;
};

export function startServers() {
  const tcpServer = createServer();
  const wss = new WebSocketServer({ port: WEBSOCKET_PORT });

  const clients: Map<Socket, GameState> = new Map();

  let clientIdCounter = 1;

  const closeSocket = (socket: Socket) => {
    clients.delete(socket);
    socket.end();
  };

  const sendAuthRequired = (socket: Socket) => {
    socket.write(serializeMessage(MessageType.AuthRequired));
  };

  const processPassword = (socket: Socket, password: string) => {
    if (password === PASSWORD) {
      processPasswordCorrect(socket);
      clients.set(socket, { ...clients.get(socket)!, loggedIn: true });
    } else {
      processPasswordIncorrect(socket);
    }
  };

  const processPasswordCorrect = (socket: Socket) => {
    socket.write(
      serializeMessage(MessageType.PasswordCorrect, clientIdCounter.toString())
    );
  };

  const processPasswordIncorrect = (socket: Socket) => {
    socket.write(serializeMessage(MessageType.FPasswordIncorrect));
    closeSocket(socket);
  };

  const getOpponents = (socket: Socket) =>
    Array.from(clients.values())
      .filter(
        (client) =>
          client.loggedIn &&
          !client.inGame &&
          client.clientId !== clients.get(socket)!.clientId
      )
      .map((client) => client.clientId.toString());

  const processGetOpponents = (socket: Socket) => {
    const clientSocket = clients.get(socket);

    if (clientSocket?.loggedIn && !clientSocket.inGame) {
      const opponents = getOpponents(socket);

      if (opponents.length > 0) {
        socket.write(
          serializeMessage(MessageType.Opponents, opponents.join(","))
        );
      } else {
        socket.write(serializeMessage(MessageType.FNoOpponents));
        closeSocket(socket);
      }
    } else {
      processWrongState(socket);
    }
  };

  const getOpponentById = (opponentId: string) => {
    const opponent = Array.from(clients).find(
      ([_, client]) => client.clientId === parseInt(opponentId)
    );
    return opponent ? opponent[0] : undefined;
  };

  const processChallenge = (socket: Socket, challengeContent: string) => {
    const opponents = getOpponents(socket);
    const [secretWord, opponentId] = challengeContent.split("|");

    if (
      opponents.length > 0 &&
      (opponentId.length === 0 || opponents.includes(opponentId))
    ) {
      const opponent = parseInt(
        opponentId.length === 0 ? opponents[0] : opponentId
      );
      const opponentSocket = getOpponentById(opponent.toString());

      if (opponentSocket) {
        const client = clients.get(socket);
        const opponent = clients.get(opponentSocket);

        if (client && opponent) {
          client.inGame = true;
          client.secretWord = secretWord;
          opponent.inGame = true;
          opponent.isGuessing = true;
          client.opponentId = opponent.clientId;
          opponent.opponentId = client.clientId;

          socket.write(
            serializeMessage(
              MessageType.ChallengeAccepted,
              opponent.clientId.toString()
            )
          );
          opponentSocket.write(
            serializeMessage(MessageType.GuessStart, client.clientId.toString())
          );
        }
      } else {
        processWrongState(socket);
      }
    } else {
      processWrongState(socket);
    }
  };

  const processWrongState = (socket: Socket) => {
    socket.write(serializeMessage(MessageType.WrongState));
    closeSocket(socket);
  };

  const processGiveUp = (socket: Socket) => {
    const opponent = getOpponentById(
      clients.get(socket)!.opponentId!.toString()
    );

    if (opponent) {
      opponent.write(serializeMessage(MessageType.FGameOver));
      closeSocket(opponent);
    }

    closeSocket(socket);
  };

  tcpServer.on("connection", (socket: Socket) => {
    const clientId = clientIdCounter++;
    clients.set(socket, {
      clientId: clientId,
      loggedIn: false,
      inGame: false,
      isGuessing: false,
    });

    sendAuthRequired(socket);

    socket.on("data", (data) => {
      const { type, payload } = deserializeMessage(data);

      switch (type) {
        case MessageType.SendingPassword:
          processPassword(socket, payload.toString());

          break;
        case MessageType.GetOpponents:
          processGetOpponents(socket);
          break;
        case MessageType.Challenge:
          processChallenge(socket, payload.toString());
          break;
        case MessageType.FGiveUp:
          processGiveUp(socket);
          break;
        default:
          socket.write(serializeMessage(MessageType.UnknownMessageType));
          break;
      }
    });

    socket.on("close", () => {
      clients.delete(socket);
    });
  });

  const server = tcpServer.listen(TCP_PORT, () => {
    // console.log(`TCP and WebSocket server listening on port ${TCP_PORT}`);
  });

  server.on("upgrade", (request, socket, head) => {
    // wss.handleUpgrade(request, socket, head, (ws: any) => {
    //     wss.emit('connection', ws, request);
    // });
  });

  return { tcpServer, wss };
}

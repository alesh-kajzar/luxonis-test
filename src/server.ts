import { createServer, Socket } from "net";
import { WebSocketServer } from "ws";
import { PASSWORD, TCP_PORT, WEBSOCKET_PORT } from "./config";
import {
  serializeMessage,
  MessageType,
  deserializeMessage,
  decodeMovePayload,
} from "./protocol";

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
    socket.write(serializeMessage(MessageType.OAuthRequired));
  };

  const processPassword = (socket: Socket, password?: string) => {
    if (password === PASSWORD) {
      processPasswordCorrect(socket);
      clients.set(socket, { ...clients.get(socket)!, loggedIn: true });
    } else {
      processPasswordIncorrect(socket);
    }
  };

  const processPasswordCorrect = (socket: Socket) => {
    socket.write(
      serializeMessage(MessageType.OPasswordCorrect, clientIdCounter.toString())
    );
  };

  const processPasswordIncorrect = (socket: Socket) => {
    socket.write(serializeMessage(MessageType.OFPasswordIncorrect));
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
          serializeMessage(MessageType.OOpponents, opponents.join(","))
        );
      } else {
        socket.write(serializeMessage(MessageType.OFNoOpponents));
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

  const processChallenge = (socket: Socket, challengeContent?: string) => {
    const opponents = getOpponents(socket);

    if (challengeContent) {
      const { opponentId, secret } = decodeMovePayload(challengeContent);

      if (
        opponents.length > 0 &&
        (!opponentId || opponents.includes(opponentId))
      ) {
        const opponent = parseInt(opponentId ? opponentId : opponents[0]);
        const opponentSocket = getOpponentById(opponent.toString());

        if (opponentSocket) {
          const clientGS = clients.get(socket);
          const opponentGS = clients.get(opponentSocket);

          if (clientGS && opponentGS) {
            clientGS.inGame = true;
            clientGS.secretWord = secret;
            opponentGS.inGame = true;
            opponentGS.isGuessing = true;
            clientGS.opponentId = opponentGS.clientId;
            opponentGS.opponentId = clientGS.clientId;

            socket.write(
              serializeMessage(
                MessageType.OChallengeAccepted,
                opponentGS.clientId.toString()
              )
            );
            opponentSocket.write(
              serializeMessage(
                MessageType.OGuessStart,
                clientGS.clientId.toString()
              )
            );
          }
        } else {
          processWrongState(socket); // opponent not found
        }
      } else {
        processWrongState(socket); // no opponents available
      }
    } else {
      processWrongState(socket); // no challenge content (no secret word)
    }
  };

  const processWrongState = (socket: Socket) => {
    socket.write(serializeMessage(MessageType.OFWrongState));
    closeSocket(socket);
  };

  const processGiveUp = (socket: Socket) => {
    const opponentSocket = getOpponentById(
      clients.get(socket)!.opponentId!.toString()
    );

    if (opponentSocket) {
      opponentSocket.write(serializeMessage(MessageType.OFGameOver));
      closeSocket(opponentSocket);
    }

    closeSocket(socket);
  };

  const processMove = (socket: Socket, move?: string) => {
    const clientGS = clients.get(socket);
    const opponentSocket = getOpponentById(clientGS!.opponentId!.toString());

    if (clientGS && opponentSocket) {
      const opponentGS = clients.get(opponentSocket);

      if (opponentGS && clientGS.isGuessing) {
        if (move === opponentGS.secretWord) {
          socket.write(serializeMessage(MessageType.OFWin));
          opponentSocket.write(serializeMessage(MessageType.OFCorrectAttempt));
          closeSocket(socket);
          closeSocket(opponentSocket);
        } else {
          socket.write(serializeMessage(MessageType.OWrongAttempt));
          opponentSocket.write(serializeMessage(MessageType.OAttempt));
        }
      } else {
        processWrongState(socket);
      }
    } else {
      processWrongState(socket);
    }
  };

  const processHint = (socket: Socket, hint?: string) => {
    const clientGS = clients.get(socket);
    const opponentSocket = getOpponentById(clientGS!.opponentId!.toString());

    if (clientGS && opponentSocket && hint) {
      if (clientGS.isGuessing) {
        // guessing client cannot hint
        processWrongState(socket);
      } else {
        opponentSocket.write(serializeMessage(MessageType.OHint, hint));
      }
    } else {
      processWrongState(socket);
    }
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
        case MessageType.ISendingPassword:
          processPassword(socket, payload);
          break;
        case MessageType.IGetOpponents:
          processGetOpponents(socket);
          break;
        case MessageType.IChallenge:
          processChallenge(socket, payload);
          break;
        case MessageType.IMove:
          processMove(socket, payload);
          break;
        case MessageType.IHint:
          processHint(socket, payload);
          break;
        case MessageType.IFGiveUp:
          processGiveUp(socket);
          break;
        default:
          socket.write(serializeMessage(MessageType.OFUnknownMessageType));
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
function deserializerMovePayload(challengeContent: string): {
  opponentId: any;
  secretWord: any;
} {
  throw new Error("Function not implemented.");
}

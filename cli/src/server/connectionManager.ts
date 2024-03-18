import { Socket } from "net";
import { PASSWORD } from "../config";
import {
  decodeMovePayload,
  messageMap,
  MessageType,
  serializeMessage,
} from "../protocol";
import ObserverServer from "./observerServer";

type GameState = {
  clientId: number;
  loggedIn: boolean;
  inGame: boolean;
  isGuessing: boolean;
  opponentId?: number;
  secretWord?: string;
};

class ConnectionManager {
  private clients: Map<Socket, GameState>;
  private clientIdCounter: number;
  private oss: ObserverServer;

  constructor(oss: ObserverServer) {
    this.clients = new Map<Socket, GameState>();
    this.clientIdCounter = 1;
    this.oss = oss;
  }

  public initializeClient(socket: Socket) {
    const clientId = this.clientIdCounter;

    this.clients.set(socket, {
      clientId: clientId,
      loggedIn: false,
      inGame: false,
      isGuessing: false,
    });

    this.clientIdCounter++;

    this.sendAuthRequired(socket);

    return clientId;
  }

  public removeSocket(socket: Socket) {
    this.clients.delete(socket);
  }

  public closeSocket(socket: Socket) {
    this.removeSocket(socket);
    socket.end();
  }

  private sendAuthRequired(socket: Socket) {
    this.writeMessage(socket, MessageType.OAuthRequired);
  }

  public processPassword(socket: Socket, password?: string) {
    if (password === PASSWORD) {
      const clientGS = this.clients.get(socket)!;
      this.processPasswordCorrect(socket, clientGS.clientId);
      this.clients.set(socket, {
        ...clientGS,
        loggedIn: true,
      });
    } else {
      this.processPasswordIncorrect(socket);
    }
  }

  public processPasswordCorrect(socket: Socket, clientId: number) {
    this.writeMessage(
      socket,
      MessageType.OPasswordCorrect,
      clientId.toString()
    );
  }

  public processPasswordIncorrect(socket: Socket) {
    this.writeMessage(socket, MessageType.OFPasswordIncorrect);
    this.closeSocket(socket);
  }

  public getOpponents(socket: Socket) {
    return Array.from(this.clients.values())
      .filter(
        (client) =>
          client.loggedIn &&
          !client.inGame &&
          client.clientId !== this.clients.get(socket)!.clientId
      )
      .map((client) => client.clientId.toString());
  }

  public processGetOpponents(socket: Socket) {
    const clientSocket = this.clients.get(socket);

    if (clientSocket?.loggedIn && !clientSocket.inGame) {
      const opponents = this.getOpponents(socket);

      if (opponents.length > 0) {
        this.writeMessage(socket, MessageType.OOpponents, opponents.join(","));
      } else {
        this.writeMessage(socket, MessageType.OFNoOpponents);
        this.closeSocket(socket);
      }
    } else {
      this.processWrongState(socket);
    }
  }

  public getOpponentById(opponentId: string) {
    const opponent = Array.from(this.clients).find(
      ([_, client]) => client.clientId === parseInt(opponentId)
    );
    return opponent ? opponent[0] : undefined;
  }

  public processChallenge(socket: Socket, challengeContent?: string) {
    const opponents = this.getOpponents(socket);

    if (challengeContent) {
      const { opponentId, secret } = decodeMovePayload(challengeContent);

      if (
        opponents.length > 0 &&
        (!opponentId || opponents.includes(opponentId))
      ) {
        const opponent = parseInt(opponentId ? opponentId : opponents[0]);
        const opponentSocket = this.getOpponentById(opponent.toString());

        if (opponentSocket) {
          const clientGS = this.clients.get(socket);
          const opponentGS = this.clients.get(opponentSocket);

          if (clientGS && opponentGS) {
            clientGS.inGame = true;
            clientGS.secretWord = secret;
            opponentGS.inGame = true;
            opponentGS.isGuessing = true;
            clientGS.opponentId = opponentGS.clientId;
            opponentGS.opponentId = clientGS.clientId;

            this.writeMessage(
              socket,
              MessageType.OChallengeAccepted,
              opponentGS.clientId.toString()
            );
            this.writeMessage(
              opponentSocket,
              MessageType.OGuessStart,
              clientGS.clientId.toString()
            );
          }
        } else {
          this.processWrongState(socket); // opponent not found
        }
      } else {
        this.processWrongState(socket); // no opponents available
      }
    } else {
      this.processWrongState(socket); // no challenge content (no secret word)
    }
  }

  public processWrongState(socket: Socket) {
    this.writeMessage(socket, MessageType.OFWrongState);
    this.closeSocket(socket);
  }

  public processGiveUp(socket: Socket) {
    const opponentSocket = this.getOpponentById(
      this.clients.get(socket)!.opponentId!.toString()
    );

    if (opponentSocket) {
      this.writeMessage(opponentSocket, MessageType.OFGameOver);
      this.closeSocket(opponentSocket);
    }

    this.closeSocket(socket);
  }

  public processMove(socket: Socket, move?: string) {
    const clientGS = this.clients.get(socket);
    const opponentSocket = this.getOpponentById(
      clientGS!.opponentId!.toString()
    );

    if (clientGS && opponentSocket) {
      const opponentGS = this.clients.get(opponentSocket);

      if (opponentGS && clientGS.isGuessing) {
        if (move === opponentGS.secretWord) {
          this.writeMessage(socket, MessageType.OFWin);
          this.writeMessage(opponentSocket, MessageType.OFCorrectAttempt);
          this.closeSocket(socket);
          this.closeSocket(opponentSocket);
        } else {
          this.writeMessage(socket, MessageType.OWrongAttempt);
          this.writeMessage(opponentSocket, MessageType.OAttempt);
        }
      } else {
        this.processWrongState(socket);
      }
    } else {
      this.processWrongState(socket);
    }
  }

  public processContinue(socket: Socket) {
    const clientGS = this.clients.get(socket);
    const opponentSocket = this.getOpponentById(
      clientGS!.opponentId!.toString()
    );

    if (clientGS && opponentSocket) {
      const opponentGS = this.clients.get(opponentSocket);

      if (opponentGS?.isGuessing) {
        this.writeMessage(opponentSocket, MessageType.OContinue);
      } else {
        this.processWrongState(socket);
      }
    } else {
      this.processWrongState(socket);
    }
  }

  public processHint(socket: Socket, hint?: string) {
    const clientGS = this.clients.get(socket);
    const opponentSocket = this.getOpponentById(
      clientGS!.opponentId!.toString()
    );

    if (clientGS && opponentSocket && hint) {
      if (clientGS.isGuessing) {
        // guessing client cannot hint
        this.processWrongState(socket);
      } else {
        this.writeMessage(opponentSocket, MessageType.OHint, hint);
      }
    } else {
      this.processWrongState(socket);
    }
  }

  public processUnknownMessageType(socket: Socket) {
    this.writeMessage(socket, MessageType.OFUnknownMessageType);
    this.closeSocket(socket);
  }

  private writeMessage(socket: Socket, type: MessageType, payload?: string) {
    socket.write(serializeMessage(type, payload));

    this.oss.broadcast({
      clientId: this.clients.get(socket)!.clientId,
      input: false,
      type: messageMap[type],
      content: payload,
    });
  }
}

export default ConnectionManager;

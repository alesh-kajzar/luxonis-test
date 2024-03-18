import { Socket } from "net";
import { PASSWORD } from "../config";
import { decodeMovePayload, MessageType, serializeMessage } from "../protocol";

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

  constructor() {
    this.clients = new Map<Socket, GameState>();
    this.clientIdCounter = 1;
  }

  public initializeClient(socket: Socket) {
    this.clients.set(socket, {
      clientId: this.clientIdCounter,
      loggedIn: false,
      inGame: false,
      isGuessing: false,
    });

    this.clientIdCounter++;

    this.sendAuthRequired(socket);
  }

  public removeSocket(socket: Socket) {
    this.clients.delete(socket);
  }

  public closeSocket(socket: Socket) {
    this.removeSocket(socket);
    socket.end();
  }

  private sendAuthRequired(socket: Socket) {
    socket.write(serializeMessage(MessageType.OAuthRequired));
  }

  public processPassword(socket: Socket, password?: string) {
    if (password === PASSWORD) {
      this.processPasswordCorrect(socket);
      this.clients.set(socket, {
        ...this.clients.get(socket)!,
        loggedIn: true,
      });
    } else {
      this.processPasswordIncorrect(socket);
    }
  }

  public processPasswordCorrect(socket: Socket) {
    socket.write(
      serializeMessage(
        MessageType.OPasswordCorrect,
        this.clientIdCounter.toString()
      )
    );
  }

  public processPasswordIncorrect(socket: Socket) {
    socket.write(serializeMessage(MessageType.OFPasswordIncorrect));
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
        socket.write(
          serializeMessage(MessageType.OOpponents, opponents.join(","))
        );
      } else {
        socket.write(serializeMessage(MessageType.OFNoOpponents));
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
    socket.write(serializeMessage(MessageType.OFWrongState));
    this.closeSocket(socket);
  }

  public processGiveUp(socket: Socket) {
    const opponentSocket = this.getOpponentById(
      this.clients.get(socket)!.opponentId!.toString()
    );

    if (opponentSocket) {
      opponentSocket.write(serializeMessage(MessageType.OFGameOver));
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
          socket.write(serializeMessage(MessageType.OFWin));
          opponentSocket.write(serializeMessage(MessageType.OFCorrectAttempt));
          this.closeSocket(socket);
          this.closeSocket(opponentSocket);
        } else {
          socket.write(serializeMessage(MessageType.OWrongAttempt));
          opponentSocket.write(serializeMessage(MessageType.OAttempt));
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
        opponentSocket.write(serializeMessage(MessageType.OContinue));
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
        opponentSocket.write(serializeMessage(MessageType.OHint, hint));
      }
    } else {
      this.processWrongState(socket);
    }
  }

  public processUnknownMessageType(socket: Socket) {
    socket.write(serializeMessage(MessageType.OFUnknownMessageType));
    this.closeSocket(socket);
  }
}

export default ConnectionManager;

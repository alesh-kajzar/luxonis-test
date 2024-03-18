import { createServer, Socket } from "net";
import { TCP_PORT, WEBSOCKET_PORT } from "../config";
import { deserializeMessage, messageMap, MessageType } from "../protocol";
import ConnectionManager from "./connectionManager";
import ObserverServer from "./observerServer";

export function startServers() {
  const tcpServer = createServer();
  const oss = new ObserverServer(WEBSOCKET_PORT);
  const connectionManager = new ConnectionManager(oss);

  tcpServer.on("connection", (socket: Socket) => {
    const clientId = connectionManager.initializeClient(socket);

    oss.broadcast({
      clientId: clientId,
      type: "Connected",
      input: true,
    });

    socket.on("data", (data) => {
      const { type, payload } = deserializeMessage(data);

      oss.broadcast({
        clientId: clientId,
        input: true,
        type: messageMap[type],
        content: payload,
      });

      switch (type) {
        case MessageType.ISendingPassword:
          connectionManager.processPassword(socket, payload);
          break;
        case MessageType.IGetOpponents:
          connectionManager.processGetOpponents(socket);
          break;
        case MessageType.IContinue:
          connectionManager.processContinue(socket);
          break;
        case MessageType.IChallenge:
          connectionManager.processChallenge(socket, payload);
          break;
        case MessageType.IMove:
          connectionManager.processMove(socket, payload);
          break;
        case MessageType.IHint:
          connectionManager.processHint(socket, payload);
          break;
        case MessageType.IFGiveUp:
          connectionManager.processGiveUp(socket);
          break;
        default:
          connectionManager.processUnknownMessageType(socket);
          break;
      }
    });

    socket.on("close", () => {
      oss.broadcast({
        clientId: clientId,
        type: "Disconnected",
        input: true,
      });

      connectionManager.removeSocket(socket);
    });
  });

  tcpServer.listen(TCP_PORT);

  return { tcpServer, oss };
}

process.argv.length > 2 && process.argv[2] === "listen" && startServers();

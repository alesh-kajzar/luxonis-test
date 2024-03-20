import { createServer, Socket } from "net";
import { TCP_PORT, WEBSOCKET_PORT, UNIX_PATH } from "../config";
import { deserializeMessage, messageMap, MessageType } from "../protocol";
import ConnectionManager from "./connectionManager";
import ObserverServer from "./observerServer";
import { unlinkSync } from "fs";

export function startServers() {
  const tcpServer = createServer();
  const oss = new ObserverServer(WEBSOCKET_PORT);
  const connectionManager = new ConnectionManager(oss);

  const handleConnection = (socket: Socket) => {
    const clientId = connectionManager.initializeClient(socket);

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

    socket.on("error", () => {
      oss.broadcast({
        clientId: clientId,
        type: "Connection error",
        input: false,
      });
    });

    socket.on("close", () => {
      oss.broadcast({
        clientId: clientId,
        type: "Disconnected",
        input: true,
      });

      connectionManager.removeSocket(socket);
    });
  };

  tcpServer.on("connection", (socket: Socket) => {
    handleConnection(socket);
  });

  tcpServer.listen(TCP_PORT);

  const unixServer = createServer();

  if (process.platform !== "win32" && process.platform !== "darwin") {
    try {
      unlinkSync(UNIX_PATH); // remove old socket if exists
    } catch (e) {}
    unixServer.listen(UNIX_PATH);
    unixServer.on("connection", (socket: Socket) => {
      handleConnection(socket);
    });
  }

  return { tcpServer, unixServer, oss };
}

process.argv.length > 2 && process.argv[2] === "listen" && startServers();

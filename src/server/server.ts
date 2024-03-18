import { createServer, Socket } from "net";
import { WebSocketServer } from "ws";
import { TCP_PORT, WEBSOCKET_PORT } from "../config";
import { deserializeMessage, MessageType, serializeMessage } from "../protocol";
import ConnectionManager from "./connectionManager";

export function startServers() {
  const tcpServer = createServer();
  const wss = new WebSocketServer({ port: WEBSOCKET_PORT });
  const connectionManager = new ConnectionManager();

  tcpServer.on("connection", (socket: Socket) => {
    connectionManager.initializeClient(socket);

    socket.on("data", (data) => {
      const { type, payload } = deserializeMessage(data);

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
      connectionManager.removeSocket(socket);
    });
  });

  const server = tcpServer.listen(TCP_PORT);

  server.on("upgrade", (request, socket, head) => {
    // wss.handleUpgrade(request, socket, head, (ws: any) => {
    //     wss.emit('connection', ws, request);
    // });
  });

  return { tcpServer, wss };
}

process.argv.length > 2 && process.argv[2] === "listen" && startServers();

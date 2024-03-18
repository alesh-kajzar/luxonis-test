import { WebSocketServer } from "ws";

type ObserverMessage = {
  id?: number;
  clientId: number;
  type: string;
  content?: string;
  input: boolean;
};

export default class ObserverServer {
  private wss: WebSocketServer;
  private id: number;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.id = 0;
  }

  public broadcast(message: ObserverMessage) {
    this.wss.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          ...message,
          id: this.id++,
        })
      );
    });
  }

  public close() {
    this.wss.close();
  }
}

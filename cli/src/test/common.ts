import { Socket, Server as TCPServer, createConnection } from "net";
import { Server } from "ws";
import { TCP_PORT } from "../config";
import { MessageType, deserializeMessage } from "../protocol";
import { startServers } from "../server/server";
import ObserverServer from "../server/observerServer";

let tcpServer: TCPServer | undefined = undefined;
let oss: ObserverServer | undefined = undefined;

export type SequencePart = {
  expected: MessageType;
  expectedPayload?: string;
  response?: Buffer;
};

export function createClient() {
  return new Promise<Socket>((resolve, reject) => {
    const client: Socket = createConnection({ port: TCP_PORT }, () =>
      resolve(client)
    );
    client.on("error", reject);
  });
}

export function processSequence(
  receivedData: Buffer,
  sequencePart: SequencePart,
  client: Socket
) {
  const { type, payload } = deserializeMessage(receivedData);
  expect(type).toBe(sequencePart.expected);
  if (sequencePart.expectedPayload) {
    expect(payload?.toString()).toBe(sequencePart.expectedPayload);
  }

  if (sequencePart.response) {
    client.write(sequencePart.response);
  }
}

export function checkSequenceProcessed(
  getCommandIndex: () => number,
  commandSequence: SequencePart[]
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (getCommandIndex() === commandSequence.length) {
        resolve();
      } else {
        reject(
          `Sequence stopped too soon (index=${getCommandIndex()}; length=${
            commandSequence.length
          })`
        );
      }
    }, 600);
  });
}

export const testClientSequence = (
  name: string,
  ...sequences: SequencePart[][]
) => {
  test(name, async () => {
    const clientWrappers: {
      client: Socket;
      commandIndex: number;
      sequence: SequencePart[];
    }[] = await Promise.all(
      sequences.map(async (sequence) => {
        const client = await createClient();
        return { client, sequence, commandIndex: 0 };
      })
    );

    clientWrappers.forEach((clientWrapper) => {
      clientWrapper.client.on("data", (data) => {
        processSequence(
          data,
          clientWrapper.sequence[clientWrapper.commandIndex],
          clientWrapper.client
        );
        clientWrapper.commandIndex++;
      });
    });

    return expect(
      Promise.all([
        ...clientWrappers.map((clientWrapper) =>
          checkSequenceProcessed(
            () => clientWrapper.commandIndex,
            clientWrapper.sequence
          )
        ),
      ])
    ).resolves.toHaveLength(sequences.length);
  });
};

beforeAll(() => {
  const servers = startServers();
  tcpServer = servers.tcpServer;
  oss = servers.oss;
});

afterAll(() => {
  tcpServer?.close();
  oss?.close();
});

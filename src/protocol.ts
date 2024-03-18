import { Buffer } from "buffer";

export enum MessageType {
  // Input
  ISendingPassword = 1,
  IGetOpponents = 2,
  IChallenge = 3,
  IMove = 4,
  IHint = 5,
  IFGiveUp = 6,

  // Ouput
  OAuthRequired = 7,
  OPasswordCorrect = 8,
  OChallengeAccepted = 9,
  OChallengeRejected = 10,
  OOpponents = 11,
  OGuessStart = 12,
  OAttempt = 13,
  OWrongAttempt = 14,
  OHint = 15,

  // Output final states
  OFPasswordIncorrect = 16,
  OFNoOpponents = 17,
  OFGameOver = 18,
  OFWrongState = 19,
  OFWin = 20,
  OFCorrectAttempt = 21,

  OFUnknownMessageType = 255,
}

// Serialize a message
export function serializeMessage(type: MessageType, payload?: string): Buffer {
  const length = payload ? Buffer.byteLength(payload) : 0;
  const buffer = Buffer.alloc(3 + length);
  buffer.writeUInt8(type, 0);
  buffer.writeUInt16BE(length, 1);
  if (payload) {
    buffer.write(payload, 3);
  }
  return buffer;
}

// Deserialize a message
export function deserializeMessage(buffer: Buffer): {
  type: MessageType;
  payload?: string;
} {
  const type = buffer.readUInt8(0) as MessageType;

  if (buffer.length < 3) {
    return { type: MessageType.OFUnknownMessageType };
  } else if (buffer.length === 3) {
    return { type };
  } else {
    const length = buffer.readUInt16BE(1);
    const payload = buffer.subarray(3, 3 + length).toString();
    return { type, payload };
  }
}

export function decodeMovePayload(payload: string): {
  secret: string;
  opponentId: string;
} {
  const [secret, opponentId] = payload.split("|");
  return { secret, opponentId };
}

export function encodeMovePayload(secret: string, opponentId?: string): string {
  return opponentId ? `${secret}|${opponentId}` : secret;
}

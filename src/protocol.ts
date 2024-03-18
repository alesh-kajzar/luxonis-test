import { Buffer } from "buffer";

export enum MessageType {
  AuthRequired = 0x01,
  SendingPassword = 0x02,
  PasswordCorrect = 0x03,
  FPasswordIncorrect = 0x04,
  GetOpponents = 0x05,
  Opponents = 0x06,
  FNoOpponents = 0x07,
  Challenge = 0x08,
  ChallengeAccepted = 0x09,
  ChallengeRejected = 0x0a,
  Move = 0x0b,
  Hint = 0x0c,
  FGameOver = 0x0d,
  FGiveUp = 0x0e,
  WrongState = 0x0f,
  GuessStart = 0x10,
  Attempt = 0x11,
  WrongAttempt = 0x12,
  FWin = 0x13,
  FCorrectAttempt = 0x14,
  UnknownMessageType = 0xff,
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
  payload: Buffer;
} {
  const type = buffer.readUInt8(0) as MessageType;

  if (buffer.length < 3) {
    return { type: MessageType.UnknownMessageType, payload: Buffer.alloc(0) };
  } else if (buffer.length === 3) {
    return { type, payload: Buffer.alloc(0) };
  } else {
    const length = buffer.readUInt16BE(1);
    const payload = buffer.subarray(3, 3 + length);
    return { type, payload };
  }
}

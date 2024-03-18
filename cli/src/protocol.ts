import { Buffer } from "buffer";

export enum MessageType {
  // Input
  ISendingPassword = 1,
  IGetOpponents = 2,
  IChallenge = 3,
  IMove = 4,
  IHint = 5,
  IFGiveUp = 6,
  IContinue = 7,

  // Ouput
  OAuthRequired = 10,
  OPasswordCorrect = 11,
  OChallengeAccepted = 12,
  OChallengeRejected = 13,
  OOpponents = 14,
  OGuessStart = 15,
  OAttempt = 16,
  OWrongAttempt = 17,
  OHint = 18,
  OContinue = 19,

  // Output final states
  OFPasswordIncorrect = 31,
  OFNoOpponents = 32,
  OFGameOver = 33,
  OFWrongState = 34,
  OFWin = 35,
  OFCorrectAttempt = 36,

  OFUnknownMessageType = 255,
}

export const messageMap = {
  [MessageType.ISendingPassword]: "Password sent",
  [MessageType.IGetOpponents]: "Get opponents",
  [MessageType.IChallenge]: "Challenge",
  [MessageType.IMove]: "Move",
  [MessageType.IHint]: "Hint",
  [MessageType.IFGiveUp]: "Give up",
  [MessageType.IContinue]: "Continue",
  [MessageType.OAuthRequired]: "Auth required",
  [MessageType.OPasswordCorrect]: "Password correct",
  [MessageType.OChallengeAccepted]: "Challenge accepted",
  [MessageType.OChallengeRejected]: "Challenge rejected",
  [MessageType.OOpponents]: "Opponents",
  [MessageType.OGuessStart]: "Guess start",
  [MessageType.OAttempt]: "Attempt",
  [MessageType.OWrongAttempt]: "Wrong attempt",
  [MessageType.OHint]: "Hint",
  [MessageType.OContinue]: "Continue",
  [MessageType.OFPasswordIncorrect]: "Password incorrect",
  [MessageType.OFNoOpponents]: "No opponents",
  [MessageType.OFGameOver]: "Game over",
  [MessageType.OFWrongState]: "Wrong state",
  [MessageType.OFWin]: "Win",
  [MessageType.OFCorrectAttempt]: "Correct attempt",
  [MessageType.OFUnknownMessageType]: "Unknown message",
};

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

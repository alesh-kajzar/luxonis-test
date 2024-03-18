import { PASSWORD } from "../config";
import { MessageType, serializeMessage } from "../protocol";
import { testClientSequence } from "./common";

testClientSequence(
  "test challenge accepted",

  [
    {
      expected: MessageType.AuthRequired,
      response: serializeMessage(MessageType.SendingPassword, PASSWORD),
    },
    {
      expected: MessageType.PasswordCorrect,
    },
    {
      expected: MessageType.GuessStart,
      response: serializeMessage(MessageType.FGiveUp),
    },
  ],
  [
    {
      expected: MessageType.AuthRequired,
      response: serializeMessage(MessageType.SendingPassword, PASSWORD),
    },
    {
      expected: MessageType.PasswordCorrect,
      response: serializeMessage(MessageType.GetOpponents),
    },
    {
      expected: MessageType.Opponents,
      response: serializeMessage(MessageType.Challenge),
    },
    {
      expected: MessageType.ChallengeAccepted,
    },
    {
      expected: MessageType.FGameOver,
    },
  ]
);

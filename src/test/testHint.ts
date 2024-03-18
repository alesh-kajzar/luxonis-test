import { PASSWORD } from "../config";
import { MessageType, serializeMessage } from "../protocol";
import { testClientSequence } from "./common";

testClientSequence(
  "test hint",

  [
    {
      expected: MessageType.AuthRequired,
      response: serializeMessage(MessageType.SendingPassword, PASSWORD),
    },
    {
      expected: MessageType.PasswordCorrect,
    },
    {
      expected: MessageType.Hint,
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
      response: serializeMessage(MessageType.Challenge, "1"),
    },
    {
      expected: MessageType.ChallengeAccepted,
      response: serializeMessage(MessageType.Hint, "1"),
    },
    {
      expected: MessageType.FGameOver,
    },
  ]
);

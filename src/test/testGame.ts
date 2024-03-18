import { PASSWORD } from "../config";
import { MessageType, serializeMessage } from "../protocol";
import { testClientSequence } from "./common";

testClientSequence(
  "test full game",

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
      response: serializeMessage(MessageType.Move, "0"),
    },
    {
      expected: MessageType.WrongAttempt,
      response: serializeMessage(MessageType.Move, "1"),
    },
    {
      expected: MessageType.FWin,
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
      response: serializeMessage(MessageType.Challenge, "1"),
    },
    {
      expected: MessageType.ChallengeAccepted,
    },
    {
      expected: MessageType.Attempt,
    },
    {
      expected: MessageType.FCorrectAttempt,
    },
  ]
);

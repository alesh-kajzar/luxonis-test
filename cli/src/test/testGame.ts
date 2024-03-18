import { PASSWORD } from "../config";
import { MessageType, serializeMessage } from "../protocol";
import { testClientSequence } from "./common";

testClientSequence(
  "test full game",

  [
    {
      expected: MessageType.OAuthRequired,
      response: serializeMessage(MessageType.ISendingPassword, PASSWORD),
    },
    {
      expected: MessageType.OPasswordCorrect,
    },
    {
      expected: MessageType.OGuessStart,
      response: serializeMessage(MessageType.IMove, "wrong secret"),
    },
    {
      expected: MessageType.OWrongAttempt,
    },
    {
      expected: MessageType.OContinue,
      response: serializeMessage(MessageType.IMove, "secret"),
    },
    {
      expected: MessageType.OFWin,
    },
  ],
  [
    {
      expected: MessageType.OAuthRequired,
      response: serializeMessage(MessageType.ISendingPassword, PASSWORD),
    },
    {
      expected: MessageType.OPasswordCorrect,
      response: serializeMessage(MessageType.IGetOpponents),
    },
    {
      expected: MessageType.OOpponents,
      response: serializeMessage(MessageType.IChallenge, "secret"),
    },
    {
      expected: MessageType.OChallengeAccepted,
    },
    {
      expected: MessageType.OAttempt,
      response: serializeMessage(MessageType.IContinue),
    },
    {
      expected: MessageType.OFCorrectAttempt,
    },
  ]
);

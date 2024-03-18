import { PASSWORD } from "../config";
import { MessageType, serializeMessage } from "../protocol";
import { testClientSequence } from "./common";

testClientSequence(
  "test challenge accepted",

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
      response: serializeMessage(MessageType.IFGiveUp),
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
      expected: MessageType.OFGameOver,
    },
  ]
);

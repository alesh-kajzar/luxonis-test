import { PASSWORD } from "../config";
import { MessageType, serializeMessage } from "../protocol";
import { testClientSequence } from "./common";

testClientSequence(
  "test hint",

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
    },
    {
      expected: MessageType.OHint,
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
      response: serializeMessage(MessageType.IChallenge, "secret"),
    },
    {
      expected: MessageType.OChallengeAccepted,
      response: serializeMessage(MessageType.IHint, "myhint"),
    },
    {
      expected: MessageType.OFGameOver,
    },
  ]
);

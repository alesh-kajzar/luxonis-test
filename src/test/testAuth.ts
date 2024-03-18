import { PASSWORD } from "../config";
import { MessageType, serializeMessage } from "../protocol";
import { testClientSequence } from "./common";

testClientSequence("test incorrect auth", [
  {
    expected: MessageType.OAuthRequired,
    response: serializeMessage(MessageType.ISendingPassword, "wrongpassword"),
  },
  {
    expected: MessageType.OFPasswordIncorrect,
  },
]);

testClientSequence("test no opponents available", [
  {
    expected: MessageType.OAuthRequired,
    response: serializeMessage(MessageType.ISendingPassword, PASSWORD),
  },
  {
    expected: MessageType.OPasswordCorrect,
    response: serializeMessage(MessageType.IGetOpponents),
  },
  {
    expected: MessageType.OFNoOpponents,
  },
]);

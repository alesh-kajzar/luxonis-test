import { PASSWORD } from "../config";
import { MessageType, serializeMessage } from "../protocol";
import { testClientSequence } from "./common";

testClientSequence("test incorrect auth", [
  {
    expected: MessageType.AuthRequired,
    response: serializeMessage(MessageType.SendingPassword, "wrongpassword"),
  },
  {
    expected: MessageType.FPasswordIncorrect,
  },
]);

testClientSequence("test no opponents available", [
  {
    expected: MessageType.AuthRequired,
    response: serializeMessage(MessageType.SendingPassword, PASSWORD),
  },
  {
    expected: MessageType.PasswordCorrect,
    response: serializeMessage(MessageType.GetOpponents),
  },
  {
    expected: MessageType.FNoOpponents,
  },
]);

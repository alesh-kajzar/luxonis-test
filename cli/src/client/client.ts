import { connect } from "net";
import { TCP_PORT } from "../config";
import {
  MessageType,
  deserializeMessage,
  encodeMovePayload,
  serializeMessage,
} from "../protocol";
import * as readline from "readline";

const client = connect({ port: TCP_PORT }, () => {
  console.log("Connected to server!");
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

client.on("data", (data) => {
  const { type, payload } = deserializeMessage(data);

  switch (type) {
    case MessageType.OAuthRequired:
      rl.question("Enter password: ", (password) => {
        client.write(serializeMessage(MessageType.ISendingPassword, password));
      });

      break;
    case MessageType.OPasswordCorrect:
      console.log("Password correct! Client id: " + payload?.toString());

      if (process.argv.length > 2 && process.argv[2] === "create") {
        client.write(serializeMessage(MessageType.IGetOpponents));
      }

      break;
    case MessageType.OOpponents:
      console.log("Opponents: " + payload?.toString());
      rl.question("Enter opponent id: ", (opponentId) => {
        rl.question("Enter secret to guess: ", (secret) => {
          client.write(
            serializeMessage(
              MessageType.IChallenge,
              encodeMovePayload(secret, opponentId)
            )
          );
        });
      });

      break;
    case MessageType.OChallengeAccepted:
      console.log("Challenge accepted! Waiting for attempts...");
      break;
    case MessageType.OChallengeRejected:
      console.log("Challenge rejected!");
      break;
    case MessageType.OHint:
      console.log("Hint received: " + payload?.toString());
    case MessageType.OGuessStart:
    case MessageType.OContinue:
      rl.question("Enter guess: ", (guess) => {
        client.write(serializeMessage(MessageType.IMove, guess));
      });
      break;
    case MessageType.OAttempt:
      console.log("Attempt made!");
      rl.question("Enter a hint, if you want: ", (hint) => {
        if (hint) {
          client.write(serializeMessage(MessageType.IHint, hint));
        } else {
          client.write(serializeMessage(MessageType.IContinue));
        }
      });
      break;
    case MessageType.OWrongAttempt:
      console.log("Wrong attempt! Wait for master's next instruction.");
      break;
    case MessageType.OFGameOver:
      console.log("Game over!");
      break;
    case MessageType.OFWin:
      console.log("You win!");
      break;
    case MessageType.OFCorrectAttempt:
      console.log("Correct attempt!");
      break;
    case MessageType.OFPasswordIncorrect:
      console.log("Password incorrect!");
      break;
    case MessageType.OFNoOpponents:
      console.log("No opponents available!");
      break;
    case MessageType.OFWrongState:
      console.log("Wrong state!");
      break;

    default:
      console.log("Received unknown message.");
      client.end();
      break;
  }
});

client.on("close", () => {
  console.log("Connection to server closed");
  process.exit(0);
});

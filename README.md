## Getting started

## Implementation
### TCP / Unix socket protocol

Each message is composed of up to three elements:
- 8bit Integer (message code)
- 16bit Integer (payload length)
- payload
  
If there is no need for content, only message code is sent.
Message code is translated to a enum value of type `MessageType`.
Message types have following prefixes:
- **I** (e.g., ISendingPassword) - input sent from client to server
- **O** (e.g., OAuthRequired) - output received from server
- **OF** (e.g., OFNoOpponents) - received final output (client is disconnected)

#### Protocol messages
| Message              | Payload  |  Type      |  Description          |
|----------------------|----------|------------|----------------------|
| ISendingPassword     | Yes       |  Input     |  Auth using password in payload  |  
| IGetOpponents        | No       |  Input     |  Request opponent numbers.  |  
| IChallenge           | Yes       |  Input     | Challenge an opponent, payload contains `secret` and `opponentId` delimited by '\|', e.g., `'secret\|1'`. If only a secret is provided, first available opponent is selected.                |  
| IMove                | Yes      |  Input     |  Try to guess a secret (provided in payload)                    |  
|   IHint              | Yes      |  Input     |  Hint sent from client A to client B   (provided in payload)                  |  
|   IFGiveUp           | No      |  Input Final|  Give up and close connection.                    |  
|   IContinue          | No         |  Input     |  Client A says to B 'continue with guesses'.                    |  
|   OAuthRequired      | No         |  Output    | Server requires a secret.                     |
|   OPasswordCorrect   |  No        |  Output    |  Password is correct.                    |
|  OChallengeAccepted  | No         |  Output    |  Challenge is accepted.                    |
|   OOpponents         |  Yes      |  Output    |  Server provides a list of opponents delimited by comma (after `IGetOpponents`)                  |
|   OGuessStart        |  No      |  Output    |   Client can start its guesses.                   |
|    OWrongAttempt     |  No        |  Output    | Wrong move.                     |
|     OHint            |  Yes        |  Output    |  Hint sent from A to B, payload contains the text.                    |
|    OContinue         |  No        |  Output    |   Client can continue its guesses.                    |
|    OFPasswordIncorrect|  No      |  Output Final |  Initial password is incorrect.                    |
|     OFNoOpponents    |  No      |  Output Final |  No opponents are available.                    |
|     OFGameOver       |  No      |  Output Final |  Opponent gave up.                    |
|    OFWrongState      |  No      |  Output Final |  Wrong state (ends connection).                    |
|     OFWin            |  No      |  Output Final |  Correct attempt - win!                    |
|     OFCorrectAttempt |  No      |  Output Final |  Correct attempt - client A is informed that client B won.                    |
| OFUnknownMessageType |  No      |  Output Final |  Unknown message (ends connection)                    |

In the following diagrams you can see examples of authentification and game process. For a simplification of the test task I decided to close connection on each error.

#### Auth 
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/b30737c9-775e-4523-bf8f-ab72b6127fef" width="300" />

#### Auth success
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/b2197fa7-56aa-4875-b26e-3b9309540c2d" width="300" />

#### Game
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/01c638e6-675d-4b10-9ae4-9409ae88762a" width="300" />

### Web observer
The web observer is a Vite/React application that connects to a websocket port and shows list of last messages either sent from server or a client.

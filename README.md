## Youtube video

Click the image below to see a video explanation of my implementation.

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/nQb2GHsmYj0/0.jpg)](https://www.youtube.com/embed/nQb2GHsmYj0?si=86iWErVzIYzAE6Uv)

## Prerequisites

The app is working on Ubuntu 22.04, but first you need to install some utilites mentioned below.

### Install `git`

```
sudo apt-get install git
```

### Install `curl`

```
sudo apt install curl
```

### Instal `nodejs` using `nvm`

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install v18.17.0
```

### Install `npm`

```
sudo apt install npm
```

## Getting started

There are two main folders:

- `cli` - client-server app in nodejs/typescript
  - In `cli/src/config.ts` is a basic configuration
    - Websocket observer connects to a port `:8081` by default
    - TCP port is set to `:8080` by default
    - default password for server connection is `password`
    - unix path is `/tmp/unix.sock`
- `web` - 3rd party observer option in Vite/React

The easiest option to just start the app is to try a dev mode.

### Run dev mode [recommended]

#### 1. Open a terminal and install and run server

```
cd cli
npm install
npm run dev:server
```

#### 2. Open a new terminal and run a web observer

```
cd ../web
npm install
npm run dev
```

After startup, open a web browser at provided address (default is probably [http://localhost:5173/](http://localhost:5173/)).

#### 3. Open a new terminal and run 'player' mode

```
cd ../cli
npm run dev:client
# Connected to server!
# Enter password: (input 'password' without quotation marks; password is defined in cli/src/config.ts)
# Password correct! Client id: 1
# Now wait for an opponent to challenge you!
```

#### 4. Open a new terminal and run 'game creator' mode

```
npm run dev:client create
# Connected to server!
# Enter password: (input 'password' without quotation marks as before)
# Password correct! Client id: 2
# Opponents: 1
# Enter opponent id: (input an opponent number, e.g., '2', or just confirm by <Enter>)
# Enter secret to guess: (input a secret word, e.g.: 'secret')
# Challenge accepted! Waiting for attempts...
```

Now you can go back to a player and enter your guess; follow instructions written in the standard output. Keep in mind that players alternate (creator needs to click on <Enter> or input a hint after each unsuccessful attempt of the opponent).

### Build and run a production version

```
cd cli
npm run build
npm start:server # start a server
npm start:client # start a client
cd ../web
npm run build # build a vite application
```

## Implementation

### Test driven development

I started by writing tests, then I proceeded to the implementation. Before you run them, **terminate client/server processes**, otherwise you'll get an error (`listen EADDRINUSE: address already in use :::8081`).

```
cd cli
npm run test
```

Tests cover 4 basic scenarios: authentification (success/fail), challenge when no opponent is available, full game, and full game with use of hints.
For understanding of implementation is crutial a `testClientSequence` function in `cli/test/common.ts` that tests a sequence of server responses and client inputs for a _n_ clients.

<kbd>
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/df216426-4a8d-4d7a-84ed-2a213574ec5c" />
</kbd>

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
- **IF** (IFGiveUp) - input that closes the connection (opponent is also disconnected)

#### Protocol messages

| Message Type         | Message code (int) | Payload | Type         | Description                                                                                                                                                                   |
| -------------------- | ------------------ | ------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ISendingPassword     | 1                  | Yes     | Input        | Auth using password in payload                                                                                                                                                |
| IGetOpponents        | 2                  | No      | Input        | Request opponent numbers.                                                                                                                                                     |
| IChallenge           | 3                  | Yes     | Input        | Challenge an opponent, payload contains `secret` and `opponentId` delimited by '\|', e.g., `'secret\|1'`. If only a secret is provided, first available opponent is selected. |
| IMove                | 4                  | Yes     | Input        | Try to guess a secret (provided in payload)                                                                                                                                   |
| IHint                | 5                  | Yes     | Input        | Hint sent from client A to client B (provided in payload)                                                                                                                     |
| IFGiveUp             | 6                  | No      | Input Final  | Give up and close connection.                                                                                                                                                 |
| IContinue            | 7                  | No      | Input        | Client A says to B 'continue with guesses'.                                                                                                                                   |
| OAuthRequired        | 10                 | No      | Output       | Server requires a secret.                                                                                                                                                     |
| OPasswordCorrect     | 11                 | No      | Output       | Password is correct.                                                                                                                                                          |
| OChallengeAccepted   | 12                 | No      | Output       | Challenge is accepted.                                                                                                                                                        |
| OOpponents           | 14                 | Yes     | Output       | Server provides a list of opponents delimited by comma (after `IGetOpponents`)                                                                                                |
| OGuessStart          | 15                 | No      | Output       | Client can start its guesses.                                                                                                                                                 |
| OAttempt             | 16                 | No      | Output       | Wrong move (sent as information to client A).                                                                                                                                 |
| OWrongAttempt        | 17                 | No      | Output       | Wrong move (sent as response to the guessing client).                                                                                                                         |
| OHint                | 18                 | Yes     | Output       | Hint sent from A to B, payload contains the text.                                                                                                                             |
| OContinue            | 19                 | No      | Output       | Client can continue its guesses.                                                                                                                                              |
| OFPasswordIncorrect  | 31                 | No      | Output Final | Initial password is incorrect.                                                                                                                                                |
| OFNoOpponents        | 32                 | No      | Output Final | No opponents are available.                                                                                                                                                   |
| OFGameOver           | 33                 | No      | Output Final | Opponent gave up.                                                                                                                                                             |
| OFWrongState         | 34                 | No      | Output Final | Wrong state (ends connection).                                                                                                                                                |
| OFWin                | 35                 | No      | Output Final | Correct attempt - win!                                                                                                                                                        |
| OFCorrectAttempt     | 36                 | No      | Output Final | Correct attempt - client A is informed that client B won.                                                                                                                     |
| OFUnknownMessageType | 255                | No      | Output Final | Unknown message (ends connection) .                                                                                                                                           |

In the following diagrams you can see examples of authentification and game process. For a simplification of the test task I decided to close connection on each error.

#### Auth

<kbd>
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/b30737c9-775e-4523-bf8f-ab72b6127fef" width="300" />
</kbd>

#### Auth success

<kbd>
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/b2197fa7-56aa-4875-b26e-3b9309540c2d" width="300" />
</kbd>

#### Game

<kbd>
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/01c638e6-675d-4b10-9ae4-9409ae88762a" width="300" />
</kbd>

### Web observer

The web observer is a Vite/React application that connects to a Websocket port and shows list of last messages either sent from server or a client.
Arrow down means server response, arrow up means client request.

<kbd>
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/8355295e-673b-4f63-b8a4-bb47aa132367" />
</kbd>

#### Important disclaimer

As the web observer is a **bonus task**, I decided to send messages as full strings for a simplification.
I also realise that this implementation would show only those requests that are sent during the time the website is running.
If a history woud be necessary (which is often the case in real life), I would save the messages into a file or a database instead.
I decided for this solution, because it is an easy way to show protocol messages in the real time.

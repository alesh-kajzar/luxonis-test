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

In the following diagrams you can see examples of authentification and game process. For a simplification of the test task I decided to close connection on each error.

#### Auth 
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/b30737c9-775e-4523-bf8f-ab72b6127fef" width="300" />

#### Auth success
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/b2197fa7-56aa-4875-b26e-3b9309540c2d" width="300" />

#### Game
<img src="https://github.com/alesh-kajzar/luxonis-test/assets/3010825/01c638e6-675d-4b10-9ae4-9409ae88762a" width="300" />

### Web observer
The web observer is a Vite/React application that connects to a websocket port and shows list of last messages either sent from server or a client.

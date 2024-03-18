import { connect } from 'net';
import { TCP_PORT } from './config';

function startClient() {
    const client = connect({ port: TCP_PORT }, () => {
        console.log('Connected to server!');
        // Send password or any initiation message to server after connection
        //const passwordMessage = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x0C]);
        client.write('Hello from client!');
    });
    
    client.on('data', (data) => {
        console.log('Server says:', data.toString());
        // Here you can add logic to respond to server messages based on your protocol
    });
    
    client.on('close', () => {
        console.log('Connection to server closed');
    });

    client.on('error', (err) => {
        console.error('Error:', err);
    });

    return client;
}


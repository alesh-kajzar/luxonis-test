import {
  IconCloudDataConnection,
  IconPlugConnected,
  IconPlugConnectedX,
} from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import classes from "./ObserverTable.module.css";

type Message = {
  id: number;
  clientId: number;
  type: string;
  content?: string;
  date: Date;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const ObserverTable: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8081");

    ws.onopen = () => {
      setConnectionStatus("connected");
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
    };

    ws.onmessage = (event) => {
      const message: Message = {
        ...JSON.parse(event.data.toString()),
        date: new Date(),
      };
      setMessages((prevMessages) => {
        return prevMessages.find((m) => m.id === message.id)
          ? prevMessages
          : [message, ...prevMessages].slice(0, 25);
      });
    };

    return () => {
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    };
  }, []);

  return (
    <>
      <div className={classes.connectionStatus}>
        {connectionStatus === "connected" ? (
          <IconPlugConnected color="green" />
        ) : connectionStatus == "connecting" ? (
          <IconCloudDataConnection color="orange" />
        ) : (
          <IconPlugConnectedX color="red" />
        )}{" "}
        {connectionStatus}
      </div>
      {messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Device</th>
              <th>Action</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message.id}>
                <td>{`${message.date.toLocaleDateString()} ${message.date.toLocaleTimeString()}`}</td>
                <td>
                  {!message.clientId ? "server" : `client ${message.clientId}`}
                </td>
                <td>{message.type}</td>
                <td>{message.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

export default ObserverTable;

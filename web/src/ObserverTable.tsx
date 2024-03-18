import {
  IconArrowDown,
  IconArrowUp,
  IconCloudDataConnection,
  IconPlugConnected,
  IconPlugConnectedX,
  IconRefresh,
} from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import classes from "./ObserverTable.module.css";

type Message = {
  id: number;
  clientId: number;
  type: string;
  content?: string;
  date: Date;
  input: boolean;
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
      ws.close();
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
        {connectionStatus === "disconnected" && (
          <button onClick={() => window.location.reload()}>
            <IconRefresh />
          </button>
        )}
      </div>
      {messages.length === 0 ? (
        <p>No messages yet. Try to start a client.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Device</th>
              <th>Action</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message.id}>
                <td>{message.id + 1}</td>
                <td>{`${message.date.toLocaleDateString()} ${message.date.toLocaleTimeString()}`}</td>
                <td>
                  <div
                    className={classes.device}
                    title={
                      message.input
                        ? "Message sent by client"
                        : "Message sent by server"
                    }
                  >
                    {message.input ? (
                      <IconArrowUp color="green" />
                    ) : (
                      <IconArrowDown color="orange" />
                    )}
                    {message.clientId}
                  </div>
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

"use client";

import React, { useEffect, useState } from "react";

interface Message {
  id: number;
  content: string;
  type: string;
  date: Date;
}

const ObserverTable: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8081");

    ws.onopen = () => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: 0, content: "Connected", type: "", date: new Date() },
      ]);
      console.log("Connected to server");
    };

    ws.onclose = () => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: 0, content: "Disconnected", type: "", date: new Date() },
      ]);
      console.log("Disconnected from server");
    };

    ws.onmessage = (event) => {
      const message: Message = {
        ...JSON.parse(event.data),
        date: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Client ID</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        {messages.map((message) => (
          <tr key={message.id}>
            <td>{`${message.date.toLocaleDateString()} ${message.date.toLocaleTimeString()}`}</td>
            <td>{message.type}</td>
            <td>{message.content}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ObserverTable;

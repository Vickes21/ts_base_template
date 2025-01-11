import axios, { AxiosError } from "axios";
import { TChat } from "src/schemas/chat-schema";
import { TMessage } from "src/schemas/message-schema";

export class XSalesAPI {

  private _baseUrl: string = process.env.XSALES_API_URL || 'http://localhost:3000';


  async getMessages(chatId: number): Promise<TMessage[]> {
    try {
      const response = await axios.get(`${this._baseUrl}/api/messages`, {
        params: {
          chatId
        }
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(error.message);
      } else {
        console.error(error);
      }
      throw error;
    }
  }

  async saveMessages(chatId: number, messages: Omit<TMessage, 'id'>[]): Promise<void> {
    try {
      await axios.post(`${this._baseUrl}/api/chats/${chatId}/messages`, {
        messages: messages
      });
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error("AxiosError");
      } else {
        console.error(error);
      }
      throw new Error("Error saving messages");
    }
  }

  async updateChat(id: number, data: Partial<TChat>): Promise<void> {
    try {
      await axios.put(`${this._baseUrl}/api/chats/${id}`, data);
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error("AxiosError");
        // console.error(JSON.stringify(error.response?.data));
      } else {
        console.error(error);
      }
      throw new Error("Error updating chat");
    }
  }
}
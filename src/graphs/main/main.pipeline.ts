import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages"
import { mainGraph } from "./main.graph"
import { log } from "src/graphs/main/shared/utils"
import { XSalesAPI } from "src/lib/xsales"
import { IUser } from "src/types/user"
import { TDataSource } from "src/types/data-source"


export const mainPipeline = async ({
  chatId,
  message,
  onNewMessage,
  onEndMessage,
  onNewToken,
  user,
  stream
}: {
  chatId: number
  message: string
  onNewMessage: (data: any) => void
  onEndMessage: (data: any) => void
  onNewToken: (data: any) => void
  user: IUser
  stream?: boolean

}) => {

  const graph = await mainGraph()

  //fetch messages from db
  const api = new XSalesAPI()
  const chatMessages = await api.getMessages(chatId)
  console.log('messages get', chatMessages);
  console.log(' - user:', user);



  //parse messages to langchain messages
  const messages = chatMessages.map((message) => {
    switch (message.role) {
      case "user":
        return new HumanMessage({
          content: message.content,
          name: 'User'
        })
      case "assistant":
        return new AIMessage({
          content: message.content,
          name: 'CommunicationAgent'
        })
    }
  }) as BaseMessage[]

  if (stream) {
    let eventStream = graph.streamEvents(
      {
        messages: [
          ...messages,
          new HumanMessage({
            content: message,
            name: "User"
          }),
        ],
      }, {
      tags: ['xsales-main'],
      configurable: {
        user: user
      },
      version: 'v2',
    });

    let dataSource: TDataSource = {}

    for await (const { event, tags, data, run_id, name } of eventStream) {
      // console.log('event:', event);

      if (event == 'on_chat_model_start' && tags?.includes("xsales-communication")) {
        console.log("Model started");
        onNewMessage({
          id: run_id
        })
      }


      if (event === "on_chat_model_stream" && tags?.includes("xsales-communication")) {
        if (data.chunk.content) {
          // Empty content in the context of OpenAI or Anthropic usually means
          // that the model is asking for a tool to be invoked.
          // So we only print non-empty content
          // console.log(data.chunk.content, "|");
          onNewToken({
            messageId: run_id,
            content: data.chunk.content
          })
        }
      }

      if (event === "on_chat_model_end" && tags?.includes("xsales-communication")) {
        console.log("Model ended [update]");
        console.log('saving assistant message:', data.output.content);
        console.log('dataSource:', dataSource);


        //save messages to db
        await api.saveMessages(chatId, [
          {
            content: message,
            chatId,
            role: "user"
          },
          {
            content: data.output.content,
            chatId,
            metadata: dataSource,
            role: "assistant"
          }
        ])

        dataSource = {}

        onEndMessage({
          id: run_id
        })
      }

      if (event === "on_custom_event" && name === "data_source_added") {
        console.log('DATA SOURCE ADDED');
        // console.log('data:', data);
        //recursive set data source keys with "data" key
        Object.keys(data).forEach((key) => {
          // console.log('key:', key);
          dataSource[key as keyof TDataSource] = (data as any)[key]
        })
        // console.log('dataSource:', dataSource);
      }
    }
  }
}
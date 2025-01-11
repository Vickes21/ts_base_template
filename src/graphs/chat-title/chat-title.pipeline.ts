import { chatTitleGraph } from "src/graphs/chat-title/chat-title.graph"
import { XSalesAPI } from "src/lib/xsales"



export const chatTitlePipeline = async ({
  chatId
}: {
  chatId: number
}) => {

  const graph = await chatTitleGraph()

  const api = new XSalesAPI()
  const chatMessages = await api.getMessages(chatId)

  console.log('messages get', chatMessages);

  const chatHistory = chatMessages.map((message) => {
    switch (message.role) {
      case "user":
        return `User: ${message.content}`
      case "assistant":
        return `CommunicationAgent: ${message.content}`
    }
  }).join('\n')

  const response = await graph.invoke({
    chatHistory: chatHistory
  }, {
    configurable: {
      chatId: chatId
    }
  })

  return response.chatTitle
}
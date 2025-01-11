import { END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { ChatTitleState } from "src/graphs/chat-title/chat-title.state";
import { nameChatNode } from "src/graphs/chat-title/nodes/name-chat.node";



export const chatTitleGraph = async (plot = false) => {
  const workflow = new StateGraph(ChatTitleState)
    .addNode('ChatNameAgent', nameChatNode)
    .addEdge(START, 'ChatNameAgent')
    .addEdge('ChatNameAgent', END)


  const graph = workflow.compile()

  if (plot) {
    const drawableGraph = await graph.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    const fs = require('fs');
    //save current directory
    fs.writeFileSync(__dirname + '/name-chat.png', Buffer.from(arrayBuffer));
  }

  return graph
}
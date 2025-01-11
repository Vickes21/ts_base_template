import { END, START, StateGraph } from "@langchain/langgraph";
import { supervisorNode } from "./nodes/supervisor.node";
import { AgentState, members } from "./shared/utils";
import { communicationNode } from "./nodes/communication.node";
import { dataFetcherNode } from "./nodes/data-fetcher.node";
import { analysisNode } from "src/graphs/main/nodes/analysis.node";
import { IUser } from "src/types/user";


export const mainGraph = async (plot = false) => {
  const workflow = new StateGraph(AgentState)
    .addNode('supervisor', supervisorNode)
    .addNode('DataFetcherAgent', dataFetcherNode)
    .addNode('AnalysisAndInsightAgent', analysisNode)
    .addNode('CommunicationAgent', communicationNode)
    .addEdge(START, 'supervisor')
    .addEdge('CommunicationAgent', END)

  members.filter((m) => m != 'CommunicationAgent').forEach((member) => {
    workflow.addEdge(member, "supervisor");
  });

  workflow.addConditionalEdges(
    "supervisor",
    (x: typeof AgentState.State) => x.next,
  );


  const graph = workflow.compile()

  if (plot) {
    const drawableGraph = await graph.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    const fs = require('fs');
    //save current directory
    fs.writeFileSync(__dirname + '/main.png', Buffer.from(arrayBuffer));
  }

  return graph
}
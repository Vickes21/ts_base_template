import { END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { ExampleState } from "src/graphs/example/example.state";
import { exampleNode } from "src/graphs/example/nodes/example.node";



export const exampleGraph = async (plot = false) => {
  const workflow = new StateGraph(ExampleState)
    .addNode('ExampleAgent', exampleNode)
    .addEdge(START, 'ExampleAgent')
    .addEdge('ExampleAgent', END)


  const graph = workflow.compile()

  if (plot) {
    const drawableGraph = await graph.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    const fs = require('fs');
    //save current directory
    fs.writeFileSync(__dirname + '/example.png', Buffer.from(arrayBuffer));
  }

  return graph
}
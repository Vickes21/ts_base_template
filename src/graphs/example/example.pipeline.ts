import { exampleGraph } from "src/graphs/example/example.graph"
import { TExamplePipelineParams } from "src/graphs/example/schemas/example-pipeline-params.schema"



export const examplePipeline = async ({
  example
}: TExamplePipelineParams) => {

  const graph = await exampleGraph()


  const response = await graph.invoke({
    example: `Exemplo: ${example}`
  }, {
    configurable: {
      example_config: 'configuração de exemplo'
    }
  })

  return response.example
}
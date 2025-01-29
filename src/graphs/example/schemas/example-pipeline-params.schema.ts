import { z } from "zod";


export const examplePipelineParamsSchema = z.object({
  example: z.string()
})

export type TExamplePipelineParams = z.infer<typeof examplePipelineParamsSchema>
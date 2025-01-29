import { FastifyInstance, FastifyPluginOptions } from "fastify"
import { examplePipeline } from "src/graphs/example/example.pipeline";
import { helloWordApiParamsSchema } from "src/schemas/api";

export const router = (fastify: FastifyInstance, opts: FastifyPluginOptions, done: () => void) => {
  fastify.post('/hello-world', async (request, reply) => {

    const parsed = helloWordApiParamsSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .code(422)
        .send({ error: parsed.error });
    }

    const data = parsed.data;

    const exampleResponse = await examplePipeline({
      example: data.example
    })

    return reply.send({
      response: exampleResponse
    });
  })




  done()
}

export default router
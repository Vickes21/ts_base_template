import { FastifyInstance, FastifyPluginOptions } from "fastify"
import { chatTitlePipeline } from "src/graphs/chat-title/chat-title.pipeline";
import { setChatTitleApiParamsSchema } from "src/schemas/api";

export const router = (fastify: FastifyInstance, opts: FastifyPluginOptions, done: () => void) => {
  fastify.post('/set-chat-title', async (request, reply) => {

    const parsed = setChatTitleApiParamsSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .code(422)
        .send({ error: parsed.error });
    }

    const data = parsed.data;

    const title = await chatTitlePipeline({
      chatId: data.chatId
    })

    return reply.send({ title });
  })




  done()
}

export default router
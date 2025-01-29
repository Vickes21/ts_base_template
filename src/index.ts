import fastify from 'fastify'
import router from './routes/router';
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import cors from '@fastify/cors'

const app = fastify({

  logger: process.env.LOGGER === 'true'
})
app.register(cors, {
  origin: process.env.ALLOWED_ORIGIN
})

app.register(router);

// Run the server!
app.listen({ port: 3001, host: '0.0.0.0' }, async function (err, address) {
  if (err) {
    app.log.error(err)
    await awaitAllCallbacks();
    process.exit(1)
  }
  // Server is now listening on ${address}
  process.on('SIGINT', async () => {
    console.log('Received SIGINT');
    await awaitAllCallbacks().then(() => {
      console.log('Exiting after callbacks');
      process.exit(0);
    });
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM');
    await awaitAllCallbacks().then(() => {
      console.log('Exiting after callbacks');
      process.exit(0);
    });
  });
})
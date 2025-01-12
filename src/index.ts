import fastify from 'fastify'
import router from './routes/router';
import fastifyIO from "fastify-socket.io";
import { mainPipeline } from './graphs/main/main.pipeline';
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import cors from '@fastify/cors'

const fs = require('fs')
const app = fastify({
  https: {
    key: fs.readFileSync('/home/vitor/certs/privkey.pem'),
    cert: fs.readFileSync('/home/vitor/certs/fullchain.pem')
  },
  logger: true
})
app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
})

app.register(fastifyIO, {

});



app.register(router);

app.ready().then(() => {
  app.io.of('/main').on('connection', (socket) => {
    console.log('a user connected to main');
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

    socket.on('message', async (data) => {
      console.log('message: ', data);
      await mainPipeline({
        chatId: data.chatId,
        message: data.message,
        stream: true,
        user: data.user,
        onNewMessage: (data) => {
          socket.emit('newMessage', {
            id: data.id,
          });
        },
        onNewToken: (data) => {
          socket.emit('token', {
            message_id: data.messageId,
            content: data.content,
          });
        },
        onEndMessage: (data) => {
          socket.emit('endMessage', {
            id: data.id,
          });
        }
      })
    })
  });

  app.io.of('/conversation').on('connection', (socket) => {
    console.log('a user connected to conversation');
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

    socket.on('message', (msg) => {
      console.log('message: ' + msg);
    })
  });

})

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
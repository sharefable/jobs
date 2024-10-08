import WS, { WebSocketServer } from 'ws';
import http from 'http';
import { RealtimeClient } from '@openai/realtime-api-beta';
import {IncomingMessage} from 'http';

export default class RealtimeRelay {
  wss: WS.Server;

  constructor(server: http.Server) {
    // this.sockets = new WeakMap();
    this.wss = new WebSocketServer({ server });
    this.wss.on('connection', this.connectionHandler.bind(this));
    this.log(`Listening on ws://${JSON.stringify(server.address())}`);
  }

  close() {
    // TODO close all socket connections
    this.wss.close();
  }

  // TODO auth
  // TODO move system prompt, functions in server
  // TODO don't create new clientConnection to openai for client <-> relay reconnection
  async connectionHandler(ws: WebSocketServer, req: IncomingMessage) {
    if (!req.url) {
      this.log('No URL provided, closing connection.');
      ws.close();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname !== '/') {
      this.log(`Invalid pathname: "${pathname}"`);
      ws.close();
      return;
    }

    const apiKey = process.env.OPENAI_KEY as string;
    this.log(`Connecting with key "${apiKey!.slice(0, 3)}..."`);
    // const { RealtimeClient } = await import('@openai/realtime-api-beta');

    return;

    const client = new RealtimeClient({ apiKey }); // TODO save the client may be for reconnection

    // Relay: OpenAI Realtime API Event -> Browser Event
    client.realtime.on('server.*', (event: any) => {
      this.log(`Relaying "${event.type}" to Client`);
      (ws as any).send(JSON.stringify(event));
    });
    client.realtime.on('close', () => ws.close());

    // Relay: Browser Event -> OpenAI Realtime API Event
    // We need to queue data waiting for the OpenAI connection
    const messageQueue: any[] = [];
    const messageHandler = (data: any) => {
      try {
        const event = JSON.parse(data);
        this.log(`Relaying "${event.type}" to OpenAI`);
        client.realtime.send(event.type, event);
      } catch (err) {
        const e = err as Error;
        console.error(e.message);
        this.log(`Error parsing event from client: ${data}`);
      }
    };
    ws.on('message', (data: any) => {
      if (!client.isConnected()) {
        messageQueue.push(data);
      } else {
        messageHandler(data);
      }
    });
    ws.on('close', () => client.disconnect());

    // Connect to OpenAI Realtime API
    // TODO retry and all
    try {
      this.log('Connecting to OpenAI...');
      await client.connect();
    } catch (err) {
      const e = err as Error;
      this.log(`Error connecting to OpenAI: ${e.message}`);
      this.log(e.stack);
      ws.close();
      return;
    }
    this.log('Connected to OpenAI successfully!');
    while (messageQueue.length) {
      messageHandler(messageQueue.shift());
    }
  }

  log(...args: any[]) {
    console.log(`[RealtimeRelay][${(+new Date() / 1000) | 0}]`, ...args);
  }
}

import {
    connect as amqpConnect,
    AmqpChannel,
    AmqpConnection,
} from "https://deno.land/x/amqp@v0.12.0/mod.ts";
import { MuxAsyncIterator } from "https://deno.land/std@0.62.0/async/mod.ts";
import { SarifClient } from './client.ts';
import {
    SarifMessage,
    SarifConnection,
    SarifMessageHandler,
} from './interfaces.ts';
import { getTopic, generateId } from './util.ts';

export class SarifAmqpConnection implements SarifConnection {
    #url: string;
    #isOpen: boolean = false;
    #handler?: SarifMessageHandler;

    #connection?: AmqpConnection;
    #in?: AmqpChannel;
    #out?: AmqpChannel;
    #inqueue?: string;

    constructor(url = '') {
        if (url === '') {
            url = Deno.env.get('SARIF_QUEUE_URL') ?? '';
        }
        if (!url) {
            throw new Error('Unknown SARIF_QUEUE_URL');
        }
        this.#url = url;
    }

    async connect() {
        this.#connection = await amqpConnect(this.#url);

        this.#in = await this.#connection.openChannel();
        this.#out = await this.#connection.openChannel();

        const declareOk = await this.#in.declareQueue({
            exclusive: true,
        });
        this.#inqueue = declareOk.queue;

        this.#isOpen = true;
    }

    async publish(msg: SarifMessage) {
        const topic = getTopic(msg.action, msg.dst || "", '.');
        const body = JSON.stringify(msg);

        await this.#out!.publish(
          { exchange: "sarif", routingKey: topic },
          { contentType: "application/json" },
          new TextEncoder().encode(body),
        );
    }

    async reply(msg: SarifMessage, reply: SarifMessage) {
        reply.dst = reply.dst || msg.src;
        reply.corr = reply.corr || msg.corr || msg.id;
        await this.publish(reply);
    }

    async subscribe(action: string, device: string = '') {
        const topic = getTopic(action, device, '.') + '.#';
        await this.#in!.bindQueue({
            queue: this.#inqueue,
            exchange: "sarif",
            routingKey: topic,
        });
    }

    async consume(handler: SarifMessageHandler) {
        await this.#in!.consume(
            { queue: this.#inqueue! },
            async (args, props, data) => {
                const body = new TextDecoder().decode(data);
                const msg = JSON.parse(body);
                await this.#in!.ack({ deliveryTag: args.deliveryTag });
                handler(msg);
            },
        );
    }

    async close() {
        await this.#connection!.close();
    }
}

export async function connect(deviceId = '', url = ''): Promise<SarifClient> {
    if (deviceId === '') {
        deviceId = 'deno/' + generateId();
    }
    const conn = new SarifAmqpConnection(url);
    await conn.connect();
    const client = new SarifClient(deviceId, conn);

    return client;
}

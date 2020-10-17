import type {
    SarifMessage,
    SarifMessageHandler,
    SarifConnection,
} from './interfaces.ts';

import { getTopic, generateId } from './util.ts';

const DEFAULT_TIMEOUT = 5;

export class SarifClient {
    #deviceId: string;
    #connection: SarifConnection;
    #handler?: SarifMessageHandler;
    #handlers = new Map<string, SarifMessageHandler>();
    #replyHandlers = new Map<string, SarifMessageHandler>();

    constructor(deviceId: string, connection: SarifConnection) {
        this.#deviceId = deviceId;
        this.#connection = connection;

        this.subscribe('', this.#deviceId);
        this.subscribe('ping');
    }

    async publish(msg: SarifMessage) {
        msg.sarif = msg.sarif || "0.5";
        msg.id = msg.id || generateId();
        msg.src = msg.src || this.#deviceId;
        await this.#connection.publish(msg);
    }

    async reply(msg: SarifMessage, reply: SarifMessage) {
        reply.dst = reply.dst || msg.src;
        reply.corr = reply.corr || msg.corr || msg.id;
        await this.publish(reply);
    }

    async subscribe(action: string, device = '', handler?: SarifMessageHandler) {
        if (handler) {
            this.#handlers.set(action, handler);
        }

        await this.#connection.subscribe(action, device);
    }

    async consume() {
        await this.#connection.consume((msg: SarifMessage) => {
            this.handle(msg)
        });
    }

    async handle(msg: SarifMessage) {
        if (msg.action.startsWith("ping")) {
            this.reply(msg, { action: "ack" });
        }

        // Handle request-reply first, if corr id matches a handler
        if (msg.corr) {
            const handler = this.#replyHandlers.get(msg.corr);
            if (handler) {
                const handled = handler(msg);
                if (handled !== false) {
                    this.#replyHandlers.delete(msg.corr);
                }
                return;
            }
        }

        // Otherwise match handlers by action prefix
        this.#handlers.forEach((handler, topic) => {
            if (msg.action.startsWith(topic)) {
                handler(msg);
            }
        });
    }

    async request(msg: SarifMessage): Promise<SarifMessage> {
        if (!msg.id) {
            msg.id = generateId();
        }
        const id = msg.id;

        return new Promise<SarifMessage>((resolve) => {
            this.#replyHandlers.set(id, resolve);
            this.publish(msg);
        });
    }

    requestAll(msg: SarifMessage, handler: SarifMessageHandler): void {
        if (!msg.id) {
            msg.id = generateId();
        }
        const id = msg.id;

        this.#replyHandlers.set(id, (msg) => {
            handler(msg);
            return false;
        });

        setTimeout(() => {
            this.#replyHandlers.delete(id);
        }, DEFAULT_TIMEOUT * 1000);

        this.publish(msg);
    }

    onMessage(handler: SarifMessageHandler) {
        this.#handler = handler;
    }

    async close() {
        await this.#connection.close();
    }
}

export interface SarifMessage {
    sarif?: string;
    id?: string;
    action: string;
    src?: string;
    dst?: string;
    text?: string;
    p?: object;
    corr?: string;
}

export interface SarifMessageHandler {
    (msg: SarifMessage): void|boolean;
}

export interface SarifConnection {
    connect(): void;
    publish(msg: SarifMessage): Promise<void>;
    subscribe(action: string, device: string): Promise<void>;
    consume(handler: SarifMessageHandler): Promise<void>;
    close(): Promise<void>;
}

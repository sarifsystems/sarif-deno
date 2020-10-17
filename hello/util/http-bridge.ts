import { SarifClient, SarifMessage } from '../sarif/client.ts';


export function messageToHttp(msg: SarifMessage): object {
    const options: Record<string, any> = {
        method: 'GET',
        redirect: 'follow',
        headers: {
            'Accept': 'application/json',
        },
        body: null,
    };

    if (msg.p) {
        options.method = 'POST';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(msg.p);
    }

    return options;
}

export function wrapHttpServer(sarif: SarifClient, action: string, baseUrl = '') {
    if (baseUrl === '') {
        baseUrl = 'http://localhost';
    }

    sarif.subscribe(action, '', async (msg) => {
        if (!msg.action.startsWith(action + '/')) {
            return;
        }

        const method = msg.action.substr(action.length);
        const options = messageToHttp(msg);
        const resp = await fetch(baseUrl + method, options);
        const body = await resp.json();

        sarif.reply(msg, {
            action: 'http/' + resp.status,
            p: body,
            text: JSON.stringify(body),
        });
    });
}

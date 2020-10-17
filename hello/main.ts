import { connect } from './sarif/amqp.ts';
import { wrapHttpServer} from './util/http-bridge.ts';

const sarif = await connect();
sarif.consume();
console.log('rdy');

wrapHttpServer(
    sarif,
    'myhttp2',
    'https://jsonplaceholder.typicode.com'
);

sarif.subscribe('docs', '', (msg) => {
    const httpGet = {
        action: 'myhttp2/:path',
        text: 'Wrapper for jsonplaceholder.typicode.com GET',
    };

    const httpPost = {
        action: 'myhttp2/:path',
        text: 'Wrapper for jsonplaceholder.typicode.com POST',
        p: {
            '...': 'Any payload gets posted as JSON',
        },
    };

    sarif.reply(msg, {
        action: 'got/docs',
        p: {
            actions: [ httpGet, httpPost ],
        },
    });
});

await Promise.race([
    Deno.signal(Deno.Signal.SIGINT),
    Deno.signal(Deno.Signal.SIGTERM)
]);
await sarif.close();

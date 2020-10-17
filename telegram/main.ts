import { connect } from './sarif/amqp.ts';
import { parseNaturalMessage } from './sarif/util.ts';
import { Bot } from "https://deno.land/x/telegram@v0.1.1/mod.ts";

const token = Deno.env.get("TELEGRAM_BOT_TOKEN") as string;

const bot = new Bot(token);
let lastChatId: string|number|undefined = undefined;

// Error handler
bot.use(async (ctx, next) => {
    try {
        await next(ctx);
    } catch (err) {
        console.error(err.message);
    }
});

const sarif = await connect();
sarif.consume();

sarif.subscribe('notify', '', (msg) => {
    if (!lastChatId) {
        return;
    }

    console.log('send', lastChatId, msg.text);
    bot.telegram.sendMessage({
        chat_id: lastChatId,
        text: msg.text || msg.action,
    });
});

bot.on("text", async (ctx) => {
    const text = ctx.message?.text;
    if (!text) {
        return;
    }

    lastChatId = ctx.chat?.id;
    console.log('received', lastChatId, text);

    if (text === "/start") {
        await ctx.reply("hello, world");
        return
    }

    const msg = parseNaturalMessage(text);
    const reply = await sarif.request(msg);
    await ctx.reply(reply.text || reply.action);
});

await bot.launch();

await Promise.race([
    Deno.signal(Deno.Signal.SIGINT),
    Deno.signal(Deno.Signal.SIGTERM)
]);
await sarif.close();
await bot.stop();
Deno.exit();

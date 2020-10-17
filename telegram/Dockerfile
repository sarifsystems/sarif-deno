FROM hayd/alpine-deno:1.3.3
WORKDIR /app
USER deno
COPY sarif sarif
RUN deno cache --unstable sarif/amqp.ts
ADD . .
RUN deno cache --unstable main.ts

CMD ["run", "--unstable", "--allow-net", "--allow-env", "main.ts"]

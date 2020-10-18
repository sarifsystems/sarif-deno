FROM hayd/alpine-deno:1.3.3
WORKDIR /app
USER deno
ADD . .
RUN deno cache --importmap=import_map.json --unstable main.ts

CMD ["run", "--importmap=import_map.json", "--unstable", "--allow-net", "--allow-env", "main.ts"]

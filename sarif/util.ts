import { SarifMessage } from './interfaces.ts';

export function getTopic(action: string, device: string, delimiter = '/'): string {
    let t = '';
    if (device !== '') {
        t += '/dev/' + device;
    }
    if (action !== "") {
        t += '/action/' + action;
    }
    t = t.slice(1).replace(/\//g, delimiter);

    return t;
}

export function generateId(): string {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let text = "";
  for(let i = 0; i < 8; i++ ) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

export function parseNaturalMessage(text: string): SarifMessage {
  const msg = {} as SarifMessage;

  if (text.startsWith('/')) {
    msg.action = text.substring(1);
  } else {
    msg.action = 'natural/handle';
    msg.text = text;
  }

  return msg;
}

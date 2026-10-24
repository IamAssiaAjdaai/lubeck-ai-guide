// Parser subprocess only: no network, subprocesses, filesystem writes or credentials.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import dgram from 'node:dgram';
import dns from 'node:dns';
import { syncBuiltinESMExports } from 'node:module';
const deny = () => { throw Error('PDF_NETWORK_DISABLED'); };
globalThis.fetch = deny;
globalThis.WebSocket = class { constructor() { deny(); } };
http.request = http.get = https.request = https.get = deny;
net.connect = net.createConnection = deny;
net.Socket.prototype.connect = deny;
dgram.createSocket = deny;
dns.lookup = dns.resolve = deny;
syncBuiltinESMExports();

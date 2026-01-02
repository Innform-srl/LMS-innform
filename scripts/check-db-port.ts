import net from 'net';

const client = new net.Socket();
const port = 5432;
const host = 'localhost';

console.log(`Attempting to connect to ${host}:${port}...`);

client.connect(port, host, () => {
    console.log(`✅ Connected to ${host}:${port}`);
    client.destroy();
});

client.on('error', (err) => {
    console.error(`❌ Connection failed: ${err.message}`);
});

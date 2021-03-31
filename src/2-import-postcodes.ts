import { createReadStream } from 'fs';
import path from 'path';
import { Client } from 'pg';
import parse from 'csv-parse';

interface ConstituencyIdCache {
    [constituencyId: string]: string|null;
}

const processBuffer = async (db: Client, buffer: any[]) => {
    const values: string[] = [];
    const params: string[] = [];

    for (let i = 0; i < buffer.length; i++) {
        values.push('($' + (i * 3 + 1) + ', $' + (i * 3 + 2) + ', $' + (i * 3 + 3) + ')');

        params.push(buffer[i][0]);
        params.push(buffer[i][1]);
        params.push(buffer[i][2]);
    }

    await db.query('INSERT INTO postcodes VALUES ' + values.join(', ') + ' ON CONFLICT (postcode) DO NOTHING', params);
}

(async () => {
    const db = new Client({
        host: 'localhost',
        user: 'johnnoel',
        password: 'johnnoel',
        database: 'johnnoel',
        port: 2502,
    });

    await db.connect();
    await db.query('CREATE TABLE IF NOT EXISTS postcodes (postcode VARCHAR(16) PRIMARY KEY, location GEOGRAPHY(POINT, 4326) NOT NULL, constituency_id VARCHAR(9) NULL REFERENCES constituencies (id) ON DELETE RESTRICT)');

    const csvFiles = process.argv.slice(2).map(p => path.resolve(p));
    const constituencyIdCache: ConstituencyIdCache = {};

    for (const csvFile of csvFiles) {
        process.stdout.write(csvFile + "\n");

        const parser = createReadStream(csvFile).pipe(parse({
            columns: false,
            skip_empty_lines: true,
        }));

        let first = true;
        let buffer: any = [];
        const bufferSize = 25;

        for await (const record of parser) {
            if (first) { // header line
                first = false;
                continue;
            }

            const postcode = record[0].replace(/\s+/i, '');
            const constituency = record[19];
            const latitude = record[42];
            const longitude = record[43];

            if (!(constituency in constituencyIdCache)) {
                process.stdout.write('+');
                const res = await db.query('SELECT id, name FROM constituencies WHERE id = $1', [
                    constituency,
                ]);

                constituencyIdCache[constituency] = (res.rows.length > 0) ? res.rows[0].id : null;
            }

            const geom = 'POINT(' + longitude + ' ' + latitude + ')';

            buffer.push([ postcode, geom, constituencyIdCache[constituency] ]);

            if (buffer.length >= bufferSize) {
                await processBuffer(db, buffer);
                buffer = [];

                process.stdout.write('.');
            }

            if (buffer.length > 0) {
                await processBuffer(db, buffer);
            }
        }

        process.stdout.write("\n");
    }

    await db.end();
    process.exit(0);
})()

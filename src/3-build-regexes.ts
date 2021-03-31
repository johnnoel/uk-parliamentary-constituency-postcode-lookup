import { writeFileSync } from 'fs';
import { exec } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';
import { Client } from 'pg';
import QueryStream from 'pg-query-stream';
import tmp from 'tmp';

interface ConstituencyIdToRegex {
    [constituencyId: string]: string
}

const grexLocation = resolve(__dirname, '..', '..', 'grex', 'grex');
const execPromise = promisify(exec);

(async () => {
    const db = new Client({
        host: 'localhost',
        user: 'johnnoel',
        password: 'johnnoel',
        database: 'johnnoel',
        port: 2502,
    });

    await db.connect();

    const letter = process.argv[2];
    const constituencies = await db.query(
        'SELECT DISTINCT constituency_id AS id FROM postcodes WHERE constituency_id IS NOT NULL AND substring(postcode FROM 1 FOR 1) = $1 ORDER BY id',
        [ letter ]
    );

    if (constituencies.rows.length === 0) {
        console.log('No constituencies found for ' + letter);
        process.exit(0);
        return;
    }

    const output: ConstituencyIdToRegex = {};

    for (const constituency of constituencies.rows) {
        console.log(constituency.id);
        const tmpFile = tmp.fileSync();

        const query = db.query(
            new QueryStream(
                'SELECT postcode FROM postcodes WHERE constituency_id = $1 AND substring(postcode FROM 1 FOR 1) = $2 ORDER BY postcode ASC',
                [ constituency.id, letter ]
            )
        );

        for await (const row of query) {
            writeFileSync(tmpFile.name, row.postcode.replace(/\s+/i, '') + "\n", { flag: 'a' });
        }

        const regex = await execPromise(grexLocation + ' -f ' + tmpFile.name);
        output[constituency.id] = regex.stdout.trim();
    }

    const filename = resolve(__dirname, '..', 'public', 'data', letter + '.json');
    console.log(filename);
    writeFileSync(filename, JSON.stringify(output), { flag: 'w' });

    process.exit(0);
})();

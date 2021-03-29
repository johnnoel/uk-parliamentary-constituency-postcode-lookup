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

interface Regexes {
    [letter: string]: ConstituencyIdToRegex
}

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
    const constituencies = await db.query('SELECT * FROM constituencies ORDER BY name ASC');

    const regexes: Regexes = {};
    const letters = [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' ];

    for (const letter of letters) {
        regexes[letter] = {};
    }

    for (const constituency of constituencies.rows) {
        console.log(constituency.name);

        const res = await db.query('SELECT DISTINCT substring(postcode FROM 1 FOR 1) AS first_letter FROM postcodes WHERE constituency_id = $1', [
            constituency.id,
        ]);

        const firstLetters = res.rows.map(r => r.first_letter);

        for (const firstLetter of firstLetters) {
            const query = db.query(new QueryStream('SELECT postcode FROM postcodes WHERE constituency_id = $1 AND substring(postcode FROM 1 FOR 1) = $2 ORDER BY postcode ASC', [
                constituency.id, firstLetter,
            ]));

            const tmpFile = tmp.fileSync();

            for await (const row of query) {
                //console.log(row.postcode);
                writeFileSync(tmpFile.name, row.postcode + "\n", { flag: 'a' });
            }

            // execute grex on the temp file and retrieve the regex
            const result = await execPromise('/home/johnnoel/Projects/grex/grex -f ' + tmpFile.name);
            regexes[firstLetter][constituency.id] = result.stdout.trim();
        }
    }

    for (const letter in regexes) {
        // todo count regexes and if there aren't any continue

        // write the regexes as a json file
        const filename = resolve(__dirname, '..', 'public', 'build', letter + '.json');
        console.log(filename);
        writeFileSync(filename, JSON.stringify(regexes[letter]), { flag: 'w' });
    }

    process.exit(0);
})();

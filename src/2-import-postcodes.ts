import { readdirSync, createReadStream } from 'fs';
import path from 'path';
import { Client } from 'pg';
import parse from 'csv-parse';

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
    //console.log(csvFiles);

    //const csvPath = path.resolve(__dirname, '..', 'data', 'os-postcodes', 'Data', 'CSV');
    //const csvFiles = readdirSync(csvPath);

    for (const csvFile of csvFiles) {
        process.stdout.write(csvFile + "\n");

        const parser = createReadStream(csvFile).pipe(parse({
            columns: false,
            skip_empty_lines: true,
        }));

        for await (const record of parser) {
            const postcode = record[0].replace(' ', '');
            const easting = record[2];
            const northing = record[3];

            const geom = 'POINT(' + easting + ' ' + northing + ')';

            const res = await db.query('SELECT id, name FROM constituencies WHERE ST_Contains(boundary::geometry, ST_Transform(ST_GeomFromText($1, $2), 4326))', [
                geom, 27700,
            ]);

            const constituencyId = (res.rows.length > 0) ? res.rows[0].id : null;

            if (res.rows.length > 1) {
                console.log(postcode, easting, northing, res.rows);
            }

            await db.query('INSERT INTO postcodes VALUES($1, ST_Transform(ST_GeomFromText($2, $3), 4326), $4) ON CONFLICT (postcode) DO NOTHING', [
                postcode, geom, 27700, constituencyId,
            ]);

            process.stdout.write('.');
        }

        process.stdout.write("\n");
    }

    await db.end();
    process.exit(0);
})()
import { createReadStream } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';
import XmlStream from 'xml-stream';

(async () => {
    const db = new Client({
        host: 'localhost',
        user: 'johnnoel',
        password: 'johnnoel',
        database: 'johnnoel',
        port: 2502,
    });

    await db.connect();
    await db.query('CREATE TABLE IF NOT EXISTS constituencies (id VARCHAR(9) PRIMARY KEY, name VARCHAR(255) NOT NULL, boundary GEOGRAPHY(MULTIPOLYGON, 4326) NOT NULL)');

    const kmlFile = resolve(process.argv[2]);
    const stream = createReadStream(kmlFile);
    const xml = new XmlStream(stream);

    xml.collect('SimpleData');
    xml.collect('Polygon');
    xml.on('updateElement: Placemark', async (item) => {
        const name: string|null = item.ExtendedData.SchemaData.SimpleData.reduce((n, sd) => {
            if (sd['$'].name !== 'pcon18nm') {
                return n;
            }

            return sd['$text'];
        }, null);

        const id: string|null = item.ExtendedData.SchemaData.SimpleData.reduce((n, sd) => {
            if (sd['$'].name !== 'pcon18cd') {
                return n;
            }

            return sd['$text'];
        }, null);

        const polygons: string[] = [];

        if (typeof item.Polygon !== 'undefined') {
            const coords: string = item.Polygon[0].outerBoundaryIs.LinearRing.coordinates;
            const transformedCoords: string = coords.split(' ').map(lonlat => lonlat.split(',').join(' ')).join(',');
            polygons.push(transformedCoords);
        } else if (typeof item.MultiGeometry !== 'undefined') {
            for (const poly of item.MultiGeometry.Polygon) {
                const coords: string = poly.outerBoundaryIs.LinearRing.coordinates;
                const transformedCoords: string = coords.split(' ').map(lonlat => lonlat.split(',').join(' ')).join(',');
                polygons.push(transformedCoords);
            }
        }

        const polys = 'MULTIPOLYGON(' + polygons.map(p => '((' + p + '))').join(',') + ')';

        try {
            await db.query('INSERT INTO constituencies VALUES ($1, $2, ST_GeomFromText($3, $4)) ON CONFLICT (id) DO NOTHING', [
                id, name, polys, 4326,
            ]);
        } catch (e) {
            console.log(e);
        }
    });

    xml.on('end', async () => {
        await db.end();
        process.exit(0);
    });
})();

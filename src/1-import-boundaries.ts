import { createReadStream } from 'fs';
import { resolve } from 'path';
import XmlStream from 'xml-stream';

const FILENAME = 'Westminster_Parliamentary_Constituencies_(December_2019)_Boundaries_UK_BFC.kml';

const stream = createReadStream(resolve(__dirname, '..', 'data', FILENAME));
const xml = new XmlStream(stream);

xml.collect('SimpleData');
xml.on('updateElement: Placemark', (item) => {
    const name: string|null = item.ExtendedData.SchemaData.SimpleData.reduce((n, sd) => {
        if (sd['$'].name !== 'pcon19nm') {
            return n;
        }

        return sd['$text'];
    }, null);

    const coords = item.Polygon.outerBoundaryIs.LinearRing.coordinates;
});
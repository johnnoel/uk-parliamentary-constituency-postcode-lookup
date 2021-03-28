import { readdirSync, createReadStream } from 'fs';
import path from 'path';
import parse from 'csv-parse';

const processFile = async (filePath: string) => {
    const parser = createReadStream(filePath).pipe(parse({
        columns: false,
        skip_empty_lines: true,
    }));

    for await (const record of parser) {
        console.log(record);
        break;
    }
}

(async () => {
    const csvPath = path.resolve(__dirname, '..', 'data', 'os-postcodes', 'Data', 'CSV');
    const csvFiles = readdirSync(csvPath);

    for (const csvFile of csvFiles) {
        await processFile(path.resolve(csvPath, csvFile));
    }
})()
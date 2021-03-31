import { createReadStream, readFileSync } from 'fs';
import { resolve } from 'path';
import parse from 'csv-parse';

interface ConstituencyIdToRegex {
    [constituencyId: string]: RegExp;
}

interface LoadedJson {
    [letter: string]: ConstituencyIdToRegex;
}

(async () => {
    const jsonDirectory = resolve(process.argv[2]);
    const csvFiles = process.argv.slice(3).map(p => resolve(p));
    const loaded: LoadedJson = {};
    const letters: string[] = [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' ];

    // pre-load all of the generated JSON files
    for (const letter of letters) {
        const rawJson = readFileSync(resolve(jsonDirectory, letter + '.json')).toString();
        const json = JSON.parse(rawJson);
        loaded[letter] = {};

        for (const constituencyId in json) {
            loaded[letter][constituencyId] = new RegExp(json[constituencyId], 'i');
        }
    }

    // go through the CSV file and ensure each postcode matches successfully
    for (const csvFile of csvFiles) {
        const parser = createReadStream(csvFile).pipe(parse({
            columns: true,
            skip_empty_lines: true,
        }));

        for await (const record of parser) {
            const postcode = record.pcd.replace(/\s+/i, '');
            const csvConstituencyId = record.pcon;
            const firstLetter = postcode.substr(0, 1);
            let matched = false;

            // empty or synthetic constituency IDs
            if (csvConstituencyId === '' || [ 'L99999999', 'M99999999' ].indexOf(csvConstituencyId) !== -1) {
                continue;
            }

            for (const jsonConstituencyId in loaded[firstLetter]) {
                const regex = loaded[firstLetter][jsonConstituencyId];

                if (postcode.match(regex) !== null) {
                    // matched to the incorrect constituency id
                    if (jsonConstituencyId !== csvConstituencyId) {
                        console.error(postcode, csvConstituencyId, jsonConstituencyId);
                        break;
                    }

                    matched = true;
                    break;
                }
            }

            if (!matched) {
                console.error(postcode, csvConstituencyId);
                break;
            }
        }
    }

    process.exit(0);
})();

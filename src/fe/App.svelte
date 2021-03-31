<script lang="ts">
    import Constituency from './Constituency.svelte';
    import debounce from 'lodash/debounce';

    interface ConstituencyIdToRegex {
        [constituencyId: string]: RegExp;
    }

    interface LoadedJson {
        [letter: string]: ConstituencyIdToRegex;
    }

    let postcode: string;
    let loading: boolean = false;
    let couldntFind: boolean = false;
    let activeConstituency: string|null = null;

    const regex = /^([A-Z][A-HJ-Y]?[0-9][A-Z0-9]?\s*?[0-9][A-Z]{2}|GIR ?0A{2})$/i;
    const loaded: LoadedJson = {};

    const findConstituency = (postcode: string): void => {
        const firstLetter = postcode.substr(0, 1).toUpperCase();

        if (!(firstLetter in loaded)) {
            return;
        }

        // consider shifting this to a web worker if it's too heavy for devices
        const start = performance.now();
        for (const constituencyId in loaded[firstLetter]) {
            if (postcode.replace(/\s+/i, '').toUpperCase().match(loaded[firstLetter][constituencyId]) !== null) {
                activeConstituency = constituencyId;
                break;
            }
        }

        console.info('Regex matching took ' + (performance.now() - start) + 'ms');

        loading = false;

        // couldn't find postcode :(
        if (activeConstituency === null) {
            couldntFind = true;
        }
    };

    const onPostcodeInput = debounce((): void => {
        activeConstituency = null;
        couldntFind = false;

        if (postcode.trim() === '' || postcode.match(regex) === null) {
            return;
        }

        const firstLetter = postcode.substr(0, 1).toUpperCase();
        loading = true;

        if (!(firstLetter in loaded)) {
            fetch('data/' + firstLetter + '.json')
                .then(resp => resp.json())
                .then(json => {
                    loaded[firstLetter] = {};

                    for (const constituencyId in json) {
                        loaded[firstLetter][constituencyId] = new RegExp(json[constituencyId]);
                    }

                    findConstituency(postcode);
                })
            ;
        }

        findConstituency(postcode);
    }, 200);
</script>

<form>
    <fieldset>
        <div class="form-group">
            <label class="form-label text-assistive" for="postcode">Full UK postcode</label>
            <input class="form-input text-large text-center" type="text" id="postcode" autocomplete="off" bind:value={postcode} on:input={onPostcodeInput}>
        </div>

        <Constituency constituency={activeConstituency} loading={loading} couldntFind={couldntFind} />
    </fieldset>
</form>

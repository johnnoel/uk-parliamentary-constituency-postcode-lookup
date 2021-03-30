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
    let activeConstituency: string|null = null;

    const regex = /^([A-Z][A-HJ-Y]?[0-9][A-Z0-9]?\s*?[0-9][A-Z]{2}|GIR ?0A{2})$/i;
    const loaded: LoadedJson = {};

    const findConstituency = (postcode: string): void => {
        const firstLetter = postcode.substr(0, 1).toUpperCase();

        if (!(firstLetter in loaded)) {
            return;
        }

        for (const constituencyId in loaded[firstLetter]) {
            if (postcode.replace(' ', '').toUpperCase().match(loaded[firstLetter][constituencyId]) !== null) {
                activeConstituency = constituencyId;
                break;
            }
        }
    };

    const onPostcodeInput = debounce((): void => {
        activeConstituency = null;

        if (postcode.trim() === '' || postcode.match(regex) === null) {
            return;
        }

        const firstLetter = postcode.substr(0, 1).toUpperCase();

        if (!(firstLetter in loaded)) {
            loaded[firstLetter] = {};
            loading = true;

            fetch('build/' + firstLetter + '.json')
                .then(resp => resp.json())
                .then(json => {
                    loading = false;
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

        <Constituency constituency={activeConstituency} loading={loading} />
    </fieldset>
</form>

<style>
</style>

<script lang="ts">
    interface ConstituencyIdToRegex {
        [constituencyId: string]: RegExp;
    }

    interface LoadedJson {
        [letter: string]: ConstituencyIdToRegex;
    }

    let postcode: string;
    let validationError: string|null = null;
    const regex = /^([A-Z][A-HJ-Y]?[0-9][A-Z0-9]?\s*?[0-9][A-Z]{2}|GIR ?0A{2})$/i;
    const loaded: LoadedJson = {};

    const onPostcodeInput = (): void => {
        validationError = null;

        if (postcode.trim() === '') {
            return;
        }

        if (postcode.match(regex) === null) {
            validationError = 'Not a recognised postcode :(';
            return;
        }

        // postcode is valid
        const firstLetter = postcode.substr(0, 1).toUpperCase();
        if (!(firstLetter in loaded)) {
            loaded[firstLetter] = {};
            // load the json
            fetch('build/' + firstLetter + '.json')
                .then(resp => resp.json())
                .then(json => {
                    for (const constituencyId in json) {
                        loaded[firstLetter][constituencyId] = new RegExp(json[constituencyId]);
                    }
                })
            ;
        }

        // otherwise do stuff
        for (const constituencyId in loaded[firstLetter]) {
            if (constituencyId === 'E14000919') {
                //console.log(postcode.replace(' ', ''), loaded[firstLetter][constituencyId]);
            }

            //console.log(constituencyId, loaded[firstLetter][constituencyId]);
            if (postcode.replace(' ', '').match(loaded[firstLetter][constituencyId]) !== null) {
                console.log(constituencyId);
                break;
            }
        }
    }
</script>

<form>
    <fieldset>
        <label for="postcode">Full UK postcode</label>
        <input type="text" id="postcode" bind:value={postcode} on:input={onPostcodeInput}>
        {#if validationError !== null}
            <div class="toast toast-error">{validationError}</div>
        {/if}
    </fieldset>
</form>

<style>
</style>

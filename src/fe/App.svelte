<script lang="ts">
    let postcode: string;
    let validationError: string|null = null;
    const regex = /^([A-Z][A-HJ-Y]?[0-9][A-Z0-9]? ?[0-9][A-Z]{2}|GIR ?0A{2})$/i;

    const onPostcodeInput = (): void => {
        validationError = null;

        if (postcode.trim() === '') {
            return;
        }

        if (postcode.match(regex) === null) {
            validationError = 'Not a recognised postcode :(';

            return;
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

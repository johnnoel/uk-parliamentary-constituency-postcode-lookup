<script lang="ts">
    import constituencies from './constituencies.json';

    export let constituency: string|null = null;
    export let loading: boolean = false;
    export let couldntFind: boolean = false;
</script>

<div class="card bg-dark">
    <div class="card-body">
        {#if loading}
            <div class="loading loading-lg"></div>
        {:else if couldntFind}
            <div class="toast toast-error">
                Couldn't find a constituency for your postcode!<br>
                <small>If it's a real postcode and you're comfortable divulging it, please consider opening <a href="https://github.com/johnnoel/todo/issues">an issue</a> so it can be investigated.</small>
            </div>
        {:else if constituency !== null}
            <div class="toast toast-success">
                <a target="_blank" rel="nofollow noopener" href="https://members.parliament.uk/members/commons?SearchText={encodeURIComponent(constituencies[constituency]).replace('%20', '+')}&PartyId=&Gender=Any&ForParliament=0&ShowAdvanced=false">{constituencies[constituency]}</a>
            </div>
        {:else}
            <span class="text-gray">Your constituency will appear here</span>
        {/if}
    </div>
</div>

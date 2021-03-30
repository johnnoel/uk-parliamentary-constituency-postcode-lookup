<script lang="ts">
    import constituencies from './constituencies.json';

    export let constituency: string|null = null;
    export let loading: boolean = false;
</script>

<div class="card bg-dark">
    <div class="card-body">
        {#if loading}
            <div class="loading loading-lg"></div>
        {:else if constituency !== null}
            <div class="toast toast-success">
                {constituencies[constituency]}
            </div>
        {:else}
            <span class="text-gray">Your constituency will appear here</span>
        {/if}
    </div>
</div>

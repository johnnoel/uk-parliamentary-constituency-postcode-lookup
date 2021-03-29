import App from './App.svelte';

const container: HTMLElement|null = document.getElementById('app');

if (container !== null) {
    const app = new App({
        target: container,
        props: {
            name: 'world',
        },
    });
}

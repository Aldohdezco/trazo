<script lang="ts" module>
  export interface Action {
    label: string
    icon: string
    run: () => void
    danger?: boolean
    disabled?: boolean
  }
</script>

<script lang="ts">
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'

  let { title, actions, onclose }: { title: string; actions: Action[]; onclose: () => void } = $props()
</script>

<Modal {title} {onclose}>
  <ul>
    {#each actions as a (a.label)}
      <li>
        <button
          class:danger={a.danger}
          disabled={a.disabled}
          onclick={() => {
            onclose()
            a.run()
          }}
        >
          <Icon name={a.icon} />
          <span>{a.label}</span>
        </button>
      </li>
    {/each}
  </ul>
</Modal>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }

  button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 52px;
    padding: 0 14px;
    border: none;
    border-radius: 14px;
    background: none;
    font-weight: 700;
    text-align: left;
  }

  button:hover {
    background: var(--surface-2);
  }

  button:disabled {
    opacity: 0.4;
  }

  button :global(svg) {
    color: var(--accent);
    flex: none;
  }

  .danger,
  .danger :global(svg) {
    color: var(--danger);
  }
</style>

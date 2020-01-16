export default class AutoCheckElement extends HTMLElement {
  readonly input: HTMLInputElement | null;
  src: string;
  csrf: string;
  required: boolean;
}

declare global {
  interface Window {
    AutoCheckElement: typeof AutoCheckElement
  }
  interface HTMLElementTagNameMap {
    'auto-check': AutoCheckElement
  }
}
export default class AutoCheckElement extends HTMLElement {
  readonly input: HTMLInputElement | null;
  src: string;
  csrf: string;
  required: boolean;
}

export default class AutoCheckElement extends HTMLElement {
  readonly input?: HTMLInputElement;
  src: string;
  csrf: string;
  required: boolean;
}

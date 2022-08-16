import { Framework } from "@/messaging/constants";

type FrameworkData = { version: string | null } | false;
export type Libraries = Record<Framework, FrameworkData>;

export const UNKNOWN_VERSION = null;

export function detectJQuery(): FrameworkData {
  const jq = window.jQuery || window.$;
  if (jq?.fn?.jquery) {
    return {
      version: jq.fn.jquery.replace(/[^\d+.]/g, "") || UNKNOWN_VERSION,
    };
  }

  return false;
}

export function detectEmber(): FrameworkData {
  const ember = window.Ember || window.Em;
  if (ember?.GUID_KEY) {
    return { version: ember.VERSION || UNKNOWN_VERSION };
  }

  return false;
}

export function detectAngular(): FrameworkData {
  const ng = window.angular;
  if (ng) {
    return { version: ng?.version?.full || UNKNOWN_VERSION };
  }

  return false;
}

function isMatch(node: Node): boolean {
  return Boolean(node?._reactRootContainer);
}

function nodeFilter(node: Node) {
  return isMatch(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
}

export function detectReact(): FrameworkData {
  if (window.React?.Component) {
    return { version: window.React?.version || UNKNOWN_VERSION };
  }

  const reactRoot = document.querySelector<HTMLElement>("#react-root");
  const altHasReact = document.querySelector<HTMLElement>("[data-reactroot]");
  const bodyReactRoot =
    isMatch(document.body) || isMatch(document.body.firstElementChild);
  const hasReactRoot =
    bodyReactRoot ||
    document
      .createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, nodeFilter)
      .nextNode() != null;
  if (hasReactRoot || altHasReact || reactRoot?.textContent.length > 0) {
    return { version: UNKNOWN_VERSION };
  }

  return false;
}

function isVueNode(node: Node): number {
  return node.__vue__ ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
}

export function detectVue(): FrameworkData {
  const hasVueNode =
    document
      .createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, isVueNode)
      .nextNode() !== null;
  if (hasVueNode || window.Vue) {
    return { version: window.Vue?.version || UNKNOWN_VERSION };
  }

  return false;
}

export default function detectLibraries(): Libraries {
  return {
    jquery: detectJQuery(),
    emberjs: detectEmber(),
    angularjs: detectAngular(),
    react: detectReact(),
    vue: detectVue(),
  };
}

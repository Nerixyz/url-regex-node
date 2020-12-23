import * as tlds from 'tlds';

import * as ipRegex from 'ip-regex';
import { RsReWasm } from 'rsre-wasm';

/* istanbul ignore next */
const SafeRegExp = RsReWasm;
const ipv4 = ipRegex.v4().source;
const ipv6 = ipRegex.v6().source;

export interface UrlRegexOptions {
  exact: boolean,
  strict: boolean,
  auth: boolean,
  localhost: boolean,
  parens: boolean,
  apostrophes: boolean,
  trailingPeriod: boolean,
  ipv4: boolean,
  ipv6: boolean,
  tlds: string[],
}

function withDefaultOptions(inputOptions: Partial<UrlRegexOptions>): UrlRegexOptions {
  return {
    exact: false,
    strict: false,
    auth: false,
    localhost: true,
    parens: false,
    apostrophes: false,
    trailingPeriod: false,
    ipv4: true,
    ipv6: true,
    tlds: (tlds as any).default,
    ...inputOptions
  };
}

export function urlRegexNodeRaw(inputOptions: Partial<UrlRegexOptions> = {}): string {
  const options = withDefaultOptions(inputOptions);

  const protocol = `(?:(?:[a-z]+:)?//)${options.strict ? '' : '?'}`;
  // Add option to disable matching urls with HTTP Basic Authentication
  // <https://github.com/kevva/url-regex/pull/63>
  const auth = options.auth ? '(?:\\S+(?::\\S*)?@)?' : '';
  const host = '(?:(?:[a-z\\u00a1-\\uffff0-9][-_]*)*[a-z\\u00a1-\\uffff0-9]+)';
  const domain =
    '(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*';
  // Add ability to pass custom list of tlds
  // <https://github.com/kevva/url-regex/pull/66>
  const tld = `(?:\\.${
    options.strict
      ? '(?:[a-z\\u00a1-\\uffff]{2,})'
      : `(?:${options.tlds.sort((a, b) => b.length - a.length).join('|')})`
  })${options.trailingPeriod ? '\\.?' : ''}`;

  const port = '(?::\\d{2,5})?';
  // Not accept closing parenthesis
  // <https://github.com/kevva/url-regex/pull/35>
  // Don't allow apostrophes
  // <https://github.com/kevva/url-regex/pull/55>
  const path = options.parens
    ? options.apostrophes
      ? '(?:[/?#][^\\s"]*)?'
      : '(?:[/?#][^\\s"\']*)?'
    : options.apostrophes
      ? '(?:[/?#][^\\s"\\)]*)?'
      : '(?:[/?#][^\\s"\\)\']*)?';

  // Added IPv6 support
  // <https://github.com/kevva/url-regex/issues/60>
  let regex = `(?:${protocol}|www\\.)${auth}(?:`;
  if (options.localhost) regex += 'localhost|';
  if (options.ipv4) regex += `${ipv4}|`;
  if (options.ipv6) regex += `${ipv6}|`;
  regex += `${host}${domain}${tld})${port}${path}`;

  return regex;
}

export function urlRegexNode(inputOptions: Partial<UrlRegexOptions> = {}): RsReWasm {
  const options = withDefaultOptions(inputOptions)

  const regex = urlRegexNodeRaw(options);

  return options.exact
    ? new SafeRegExp(`(?:^${regex}$)`, 'i')
    : new SafeRegExp(regex, 'ig');
}

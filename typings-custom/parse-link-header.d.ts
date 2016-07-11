declare module ParseLinkHeader {
  export interface PageData {
    page: string;
    per_page: string;
    rel: string;
    url: string;
  }

  export interface LinkHeaderData {
    next: PageData;
    prev: PageData;
    last: PageData;
    first: PageData;
  }

  export interface ParseLinkHeaderFunc {
    (linkHeader: string): LinkHeaderData;
  }
}

declare module 'parse-link-header' {
  const parseLinkHeader: ParseLinkHeader.ParseLinkHeaderFunc;

  export = parseLinkHeader;
}

declare module 'parse-link-header/types' {
  export = ParseLinkHeader;
}

declare module 'config' {
  interface Get {
    (path: string): any;
  }

  const get: Get;

  export = {get};
}

declare module 'primus-emit' {
  const plugin: object;
  export default plugin;
}

declare module 'primus-spark-latency' {
  const plugin: object;
  export default plugin;
}

declare module 'primus' {
  import type { Server } from 'http';

  interface PrimusOptions {
    transformer?: string;
    pathname?: string;
    parser?: string;
  }

  class Primus {
    constructor(server: Server, options?: PrimusOptions);
    plugin(name: string, plugin: object): void;
    on(event: string, cb: (...args: any[]) => void): this;
    forEach(cb: (spark: any) => void): void;
    write(data: any): void;
    length: number;
  }

  export = Primus;
}

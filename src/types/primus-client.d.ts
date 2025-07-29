declare module 'primus-client' {
  export default class Primus {
    constructor(url: string);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    on(event: string, fn: Function): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(event: string, data?: any): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    write(data: any): void;
    end(): void;
  }
}

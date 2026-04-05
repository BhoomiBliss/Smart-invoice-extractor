declare module 'pdf2pic' {
  export interface Options {
    quality?: number;
    format?: string;
    width?: number;
    height?: number;
    density?: number;
    savePath?: string;
    saveFilename?: string;
    compression?: string;
  }

  export interface PageResponse {
    path?: string;
    name?: string;
    size?: number;
    page?: number;
  }

  export function fromPath(
    filePath: string,
    options?: Options
  ): {
    bulk: (pages?: number | number[], options?: any) => Promise<PageResponse[]>;
    (page?: number, options?: any): Promise<PageResponse>;
  };
}

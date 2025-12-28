declare module 'pdfreader' {
  export class PdfReader {
    parseBuffer(
      buffer: Buffer,
      callback: (err: Error | undefined, item: any) => void
    ): void
  }
}

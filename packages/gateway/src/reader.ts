export class ReaderLineParser {
  private buffer = "";

  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n|\r/);
    this.buffer = lines.pop() ?? "";
    return lines.map((line) => line.trim()).filter(Boolean);
  }
}

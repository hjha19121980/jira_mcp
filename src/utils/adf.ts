export function toAdf(text: string) {
  return {
    type: 'doc',
    version: 1,
    content: text.split(/\r?\n/).map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  };
}

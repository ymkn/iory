export function formatDateTime(value: number) {
  const date = new Date(value);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function countChangedLines(previousText: string, nextText: string) {
  const previousLines = previousText.split(/\r?\n/);
  const nextLines = nextText.split(/\r?\n/);
  const maxLength = Math.max(previousLines.length, nextLines.length);
  let changedLines = 0;

  for (let index = 0; index < maxLength; index += 1) {
    if (previousLines[index] !== nextLines[index]) {
      changedLines += 1;
    }
  }

  return changedLines;
}

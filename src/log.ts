function getFormattedTime(): string {
  const d1 = new Date();
  return `${
    d1.getUTCFullYear()
  }-${
    String(d1.getUTCMonth() + 1).padStart(2, '0')
  }-${
    String(d1.getUTCDate()).padStart(2, '0')
  }T${
    String(d1.getUTCHours()).padStart(2, '0')
  }:${
    String(d1.getUTCMinutes()).padStart(2, '0')
  }:${
    String(d1.getUTCSeconds()).padStart(2, '0')
  }`;
}

export const info = (...params: any[]) => {
  console.info(getFormattedTime(), '[info]', ...params);
};

export const err = (...params: any[]) => {
  console.error(getFormattedTime(), '[ err]', ...params);
};

export const warn = (...params: any[]) => {
  console.warn(getFormattedTime(), '[warn]', ...params);
};


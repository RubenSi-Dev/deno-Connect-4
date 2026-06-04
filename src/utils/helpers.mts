export async function delay(ms: number): Promise<void> {
  await Promise.resolve(new Promise((resolve) => setTimeout(resolve, ms)));
}

export async function waitOrTimeout(
  cond: () => boolean,
  timeout: number = 700,
): Promise<boolean> {
  const grain = 80;
  await delay(grain);
  let acc = grain;
  while (!cond()) {
    await delay(grain);
    acc += grain;
    if (acc >= timeout) {
      return false;
    }
  }
  return true;
}

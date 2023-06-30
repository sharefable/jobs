export default class NonRunnableErr extends Error {
  constructor (msg: string) {
    super(msg);
  }
}

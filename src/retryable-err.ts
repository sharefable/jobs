export default class RetryableErr extends Error {
  public readonly isRetryable: boolean;

  constructor (errMsg: string, isRetryable: boolean)  {
    super(errMsg);
    this.isRetryable = isRetryable;
  }
}

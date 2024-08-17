import {NextFunction, Request, Response} from 'express';

export default (err: any, req: Request, res: Response, next: NextFunction) => {
  if (!err) next();

  req.log.fatal(err);

  const errStatus = err.statusCode || 500;
  const errMsg = err.message || 'Something went wrong';
  res.status(errStatus).json({
    success: false,
    status: errStatus,
    message: errMsg,
    stack: process.env.NODE_ENV === 'development' ? err.stack : {},
  });
};
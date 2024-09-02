import { NextFunction, Request, Response } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';

export default auth({
  audience:  process.env.AUTH0_AUDIENCES,
  issuerBaseURL: process.env.AUTH0_ISSUER_URL,
});

export function verifyAuthToken(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) return res.status(401).json({ message: 'Authorization token missing from header' });
  return next();
}

// The request comes in the format of
// Authorization: Bearer <org_id>:<token>
// We need to detach the org id from the token and add it to the request
export function normalizeTokenForAuthOrigin(req: Request, res: Response, next: NextFunction) {
  const [, mixedToken] = req.headers.authorization!.split(/\s+/);
  const [orgId, token] = mixedToken.split(':');

  if (!token) return res.status(401).json({ message: 'Invalid authorization token' });

  req.relay = {
    orgId: Number.isFinite(+orgId) ? +orgId : 0,
    rawToken: req.headers.authorization!,
  };
  req.headers.authorization = `Bearer ${token}`;
  return next();
}

// Once token is resolved via auth server we reattach the orgId and forward it to other services
export function restoreRawToken(req: Request, res: Response, next: NextFunction) {
  if (req.relay && req.relay.rawToken) req.headers.authorization = req.relay.rawToken;
  next();
}

// TODO resolve fable user here by calling api
// TODO incomplete
export function resolveFableUser(req: Request, res: Response, next: NextFunction) {
  // datmh -> delegate auth to main house
  if (req.headers['x-ctrl-da-mh'] === '1') {
    req.house = {
      iam: {
        id: req.headers.authorization || 'nil',
        orgId: (req.relay || {}).orgId || 0,
      },
    };
  } else {
    req.house = {
      iam: {
        id: 'na',
        orgId: (req.relay || {}).orgId || 0,
      },
    };
  }
  return next();
}

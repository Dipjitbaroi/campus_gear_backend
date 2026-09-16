import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";

type ParsedRequestData = {
  body?: Request["body"];
  cookies?: Request["cookies"];
  params?: Request["params"];
  query?: Request["query"];
};

export const validateRequest = (schema: ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedData = (await schema.parseAsync({
        body: req.body,
        cookies: req.cookies,
        params: req.params,
        query: req.query,
      })) as ParsedRequestData;

      if (parsedData.body) {
        req.body = parsedData.body;
      }
      if (parsedData.cookies) {
        req.cookies = parsedData.cookies;
      }
      if (parsedData.params) {
        req.params = parsedData.params;
      }
      if (parsedData.query) {
        res.locals.validatedQuery = parsedData.query;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

import { Request, Response } from "express";

export default async function healthCheck(req: Request, res: Response) {
    return res.status(200).json({message: "Server is alive and well"});
}
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stripeRouter from "./stripe";
import emailRouter from "./email";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stripeRouter);
router.use(emailRouter);

export default router;

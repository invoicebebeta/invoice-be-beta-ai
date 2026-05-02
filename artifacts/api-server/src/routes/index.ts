import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stripeRouter from "./stripe";
import emailRouter from "./email";
import authRouter from "./auth";
import reviewRouter from "./review";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stripeRouter);
router.use(emailRouter);
router.use(authRouter);
router.use(reviewRouter);
router.use(pushRouter);

export default router;

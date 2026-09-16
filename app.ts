import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import config from "./config/index.js";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { categoryRoute } from "./modules/category/category.routes.js";
import { gearItemRoute } from "./modules/gearItem/gearItem.routes.js";
import { orderRoute } from "./modules/order/order.routes.js";
import { paymentRoute } from "./modules/payment/payment.routes.js";
import { reviewRoute } from "./modules/review/review.routes.js";
import { userRoute } from "./modules/user/user.routes.js";

const app: Application = express();

app.use(
  cors({
    origin: config.app_url,
    credentials: true,
  }),
);

app.use("/api/orders/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoute);
app.use("/api/gear", gearItemRoute);
app.use("/api/orders", orderRoute);
app.use("/api/payments", paymentRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/users", userRoute);
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});
app.use(notFound);
app.use(globalErrorHandler);
export default app;

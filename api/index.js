// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";

// import AuthRouter from "../routes/AuthRouter.js";
// import UsersRouter from "../routes/UsersRouter.js";
// import CategoryRouter from "../routes/CategoryRouter.js";
// import SupplierRouter from "../routes/SupplierRouter.js";
// import LocationRouter from "../routes/LocationRouter.js";
// import ProductRouter from "../routes/ProductRouter.js";
// import GoodsReceiptRouter from "../routes/GoodsReceiptRouter.js";
// import GoodsIssueRouter from "../routes/GoodsIssueRouter.js";
// import DashboardRouter from "../routes/DashboardRouter.js";
// import StockMovementRouter from "../routes/StockMovementRouter.js";
// import ReportRouter from "../routes/ReportRouter.js";
// import cookieParser from "cookie-parser";
// import ActivityLogsRouter from "../routes/ActivityLogsRouter.js";

// dotenv.config();

// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use(cookieParser());

// app.use("/auth", AuthRouter);
// app.use("/users", UsersRouter);
// app.use("/api/categories", CategoryRouter); 
// app.use("/suppliers", SupplierRouter);
// app.use("/locations", LocationRouter);
// app.use("/products", ProductRouter);
// app.use("/goods-receipts", GoodsReceiptRouter);
// app.use("/goods-issues", GoodsIssueRouter);
// app.use("/dashboard", DashboardRouter);
// app.use("/stock-movements", StockMovementRouter);
// app.use("/reports", ReportRouter);
// app.use("/activity-logs", ActivityLogsRouter);

// app.listen(process.env.PORT, () => {
//   console.log(`Server running on port ${process.env.PORT}`);
// });

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import AuthRouter from "../routes/AuthRouter.js";
import UsersRouter from "../routes/UsersRouter.js";
import CategoryRouter from "../routes/CategoryRouter.js";
import SupplierRouter from "../routes/SupplierRouter.js";
import LocationRouter from "../routes/LocationRouter.js";
import ProductRouter from "../routes/ProductRouter.js";
import GoodsReceiptRouter from "../routes/GoodsReceiptRouter.js";
import GoodsIssueRouter from "../routes/GoodsIssueRouter.js";
import DashboardRouter from "../routes/DashboardRouter.js";
import StockMovementRouter from "../routes/StockMovementRouter.js";
import ReportRouter from "../routes/ReportRouter.js";
import ActivityLogsRouter from "../routes/ActivityLogsRouter.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Cinventory API Running"
  });
});

app.use("/auth", AuthRouter);
app.use("/users", UsersRouter);
app.use("/api/categories", CategoryRouter);
app.use("/suppliers", SupplierRouter);
app.use("/locations", LocationRouter);
app.use("/products", ProductRouter);
app.use("/goods-receipts", GoodsReceiptRouter);
app.use("/goods-issues", GoodsIssueRouter);
app.use("/dashboard", DashboardRouter);
app.use("/stock-movements", StockMovementRouter);
app.use("/reports", ReportRouter);
app.use("/activity-logs", ActivityLogsRouter);

export default app;
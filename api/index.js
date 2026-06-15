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

// // app.listen(process.env.PORT, () => {
// //   console.log(`Server running on port ${process.env.PORT}`);
// // });
// const port = process.env.PORT || 5000;
// app.listen(port, () => console.log(`Listening on ${port}`));

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// 🔥 PERBAIKAN: Gunakan "../routes" karena routes di luar folder api
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

// CORS untuk development
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
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

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Root endpoint
app.get("/", (req, res) => {
    res.json({ 
        message: "Inventory API is running", 
        version: "1.0.0",
        endpoints: {
            auth: "/auth",
            users: "/users",
            categories: "/api/categories",
            suppliers: "/suppliers",
            locations: "/locations",
            products: "/products",
            goodsReceipts: "/goods-receipts",
            goodsIssues: "/goods-issues",
            dashboard: "/dashboard",
            stockMovements: "/stock-movements",
            reports: "/reports",
            activityLogs: "/activity-logs"
        }
    });
});

// 🔥 Gunakan port dari environment
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});
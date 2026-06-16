# Cinventory - Warehouse Management System (WMS)

## Deskripsi
Cinventory adalah aplikasi Warehouse Management System (WMS) berbasis web yang digunakan untuk membantu pengelolaan inventaris barang di gudang. Sistem ini memungkinkan pengguna untuk mengelola data produk, kategori, supplier, lokasi penyimpanan, transaksi barang masuk, barang keluar, serta memantau pergerakan stok secara real-time.

Aplikasi ini dirancang untuk meningkatkan efisiensi pengelolaan stok, mengurangi kesalahan pencatatan, dan menyediakan informasi inventaris yang akurat bagi perusahaan.

## Fitur

### Authentication & Authorization
* Login dan Logout
* JWT Authentication
* Role Based Access Control (Admin, Manager, Cashier)

### User Management
* CRUD User
* Manajemen Role Pengguna

### Master Data
* CRUD Kategori Barang
* CRUD Supplier
* CRUD Lokasi Penyimpanan
* CRUD Produk

### Inventory Management
* Barang Masuk (Goods Receipt)
* Barang Keluar (Goods Issue)
* Transfer Antar Lokasi
* Update Stok Otomatis

### Stock Movement
* Riwayat Pergerakan Stok
* Filter Berdasarkan Tanggal
* Filter Berdasarkan Tipe Transaksi
* Pencarian Data

### Dashboard
* Total Produk
* Total Supplier
* Total Kategori
* Statistik Barang Masuk
* Statistik Barang Keluar
* Statistik Pergerakan Stok

### Activity Log
* Pencatatan Aktivitas Pengguna
* Monitoring Aktivitas Sistem

## ERD (Entity Relationship Diagram)
![ERD Cinventory](https://github.com/user-attachments/assets/29e0368c-98c3-4407-8f89-83c50de4d395)

## Tech Stack

### Frontend
* React.js
* React Router DOM
* Tailwind CSS
* Axios
* SweetAlert2
* Lucide React

### Backend
* Node.js
* Express.js
* JWT Authentication
* Bcrypt

### Database
* PostgreSQL
* Supabase PostgreSQL

### Development Tools
* Visual Studio Code
* Postman
* Git
* GitHub
* PNPM

## Installation

### Clone Repository
- https://github.com/sintiaarganii/cinventory-fe.git
- https://github.com/sintiaarganii/cinventory-be.git

### Backend
cd cinventory-be
pnpm install
pnpm dev

### Frontend
cd cinventory-fe
pnpm install
pnpm dev

## Author

**Sintia Dwi Argani**

Project Warehouse Management System (WMS) - Cinventory

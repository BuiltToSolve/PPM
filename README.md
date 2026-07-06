# Petrol Pump Manager (PPM)

A modern, full-stack web application for managing petrol pump operations efficiently. Built with Next.js, React, and MongoDB, this application provides a centralized system to track sales, manage operators, update fuel rates, and generate insightful reports.

## 🚀 Features

- **Secure Authentication:** Robust JWT-based authentication system with secure HTTP-only cookies.
- **Dashboard Overview:** Get a quick bird's-eye view of your pump's operations and daily metrics.
- **Operator Management:** Add, update, and manage pump operators/staff.
- **Pump Management:** Keep track of multiple dispensing units/pumps and their status.
- **Fuel Rates Tracking:** Manage and update daily or fluctuating fuel prices seamlessly.
- **Daily Sales Logging:** Accurately record shift-wise or daily sales data for each pump and operator.
- **Reporting & Analytics:** Generate detailed reports to analyze sales trends and revenue.

## 🛠️ Tech Stack

- **Frontend:** [Next.js 16](https://nextjs.org/) (App Router), React 19, HTML5, CSS3
- **Backend:** Next.js Serverless API Routes
- **Database:** [MongoDB](https://www.mongodb.com/) (using native `mongodb` driver)
- **Authentication:** Custom JWT implementation using [`jose`](https://github.com/panva/jose)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Deployment:** Optimized for [Vercel](https://vercel.com/)

## ⚙️ Local Development Setup

### 1. Clone the repository
```bash
git clone <your-github-repo-url>
cd PPM
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add your MongoDB connection string and a secret key for JWT:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?appName=<AppName>
JWT_SECRET=your_super_secret_jwt_key_here
```
*(Note: Do not commit your `.env.local` file to version control)*

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🌐 Deployment (Vercel)

This project is configured for one-click deployment on Vercel.

1. Push your code to a GitHub repository.
2. Import the repository into Vercel.
3. **Important:** Under **Project Settings > Environment Variables** in Vercel, add your `MONGODB_URI` and `JWT_SECRET`.
4. Deploy!

### Troubleshooting Vercel Deployments
If you encounter an `SSL alert number 80` error during login on production, ensure that your MongoDB Atlas cluster has its Network Access IP Whitelist set to allow connections from anywhere (`0.0.0.0/0`), since Vercel uses dynamic IP addresses.

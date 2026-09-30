# 🚀 PulseChat - Vercel-First Real-Time Chat Application

Production-ready, Vercel-first real-time chat application designed from the ground up for serverless deployment.

> [!NOTE]
> **Vercel Serverless Architecture**
> - **Zero Server State**: Eliminates `app.listen()`, persistent Socket.IO servers, and local file storage.
> - **Pusher Channels**: Managed WebSocket event broadcasting (`new_message`, `typing`, `presence`).
> - **MongoDB Atlas**: Connection pooling and caching via `api/_lib/mongodb.js`.
> - **Web Crypto E2EE**: Browser-native RSA-OAEP 2048-bit + AES-256-GCM End-to-End Encryption.
> - **Cloud Storage**: Cloudinary for images, files, and voice notes.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Zustand 5, Lucide Icons, Emoji Picker React.
- **Backend/API**: Vercel Node.js Serverless API routes (`/api/*`).
- **Database**: MongoDB Atlas via Mongoose with serverless connection pooling.
- **Real-time Engine**: Pusher Channels (`pusher` server SDK & `pusher-js` client SDK).
- **Media Storage**: Cloudinary API.
- **Authentication**: Bcryptjs password hashing, Hashed OTP verification, HTTP-Only SameSite JWT cookies.

---

## 📋 Vercel Deployment Guide

Follow these exact steps to deploy this repository directly to Vercel:

### Step 1: Create MongoDB Atlas Database
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free M0 cluster.
2. In **Database Access**, create a database user and password.
3. In **Network Access**, add IP Access `0.0.0.0/0` (Allow Access from Anywhere for Vercel functions).
4. Copy the connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/chat_app?retryWrites=true&w=majority
   ```

### Step 2: Create Cloudinary Account
1. Sign up for a free account at [Cloudinary](https://cloudinary.com/).
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the Cloudinary Dashboard.

### Step 3: Create Real-Time Provider Account (Pusher)
1. Sign up at [Pusher Channels](https://pusher.com/channels).
2. Create a new app (Cluster: `mt1` or preferred region).
3. Copy **App ID**, **Key**, **Secret**, and **Cluster** from the App Keys tab.

### Step 4: Push Project to GitHub
```bash
git init
git add .
git commit -m "Initial production commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chat-application.git
git push -u origin main
```

### Step 5: Import Repository into Vercel
1. Log into [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your GitHub repository `chat-application`.
4. Framework Preset: **Vite**.

### Step 6: Configure Environment Variables on Vercel
In the **Environment Variables** section on Vercel, add the following:

| Key | Example Value | Type |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster0...` | Secret |
| `JWT_SECRET` | `super_secret_jwt_key_98765` | Secret |
| `PUSHER_APP_ID` | `1234567` | Secret |
| `PUSHER_KEY` | `abcdef12345` | Secret |
| `PUSHER_SECRET` | `secret12345` | Secret |
| `PUSHER_CLUSTER` | `mt1` | Secret |
| `VITE_PUSHER_APP_KEY` | `abcdef12345` | Public |
| `VITE_PUSHER_APP_CLUSTER` | `mt1` | Public |
| `CLOUDINARY_CLOUD_NAME` | `my_cloud` | Secret |
| `CLOUDINARY_API_KEY` | `123456789` | Secret |
| `CLOUDINARY_API_SECRET` | `secret_abc` | Secret |

### Step 7: Deploy
1. Click **Deploy**.
2. Vercel will build the frontend assets and mount all files in `api/` as serverless API routes.

---

## 💻 Local Development Workflow

Run the application locally with local API proxying:

```bash
# 1. Install dependencies
npm install

# 2. Start local serverless runner + Vite frontend
npm run dev
```

Visit `http://localhost:3000`. The local API runner serves `/api/*` routes on `http://localhost:3001` automatically.

---

## 🧪 Post-Deployment Verification Checklist

- [x] **Signup**: Register user, check hashed OTP in console/database.
- [x] **OTP Verification**: Enter 6-digit code, confirm `isVerified = true` and unique ID assigned (`USR_XXXXXX`).
- [x] **Login & Cookie**: Sign in, verify HTTP-only `auth_token` cookie is set securely.
- [x] **User Search**: Search using `USR_8F42K91X` or `@username`.
- [x] **Private Chat**: Open 2 browser windows, send instant messages via Pusher.
- [x] **Group Chat**: Create a group (`GRP_XXXXXX`), manage members.
- [x] **Image & Media**: Upload pictures, PDFs, and record voice notes.
- [x] **E2EE**: Toggle E2EE lock, verify payload ciphertext in Network inspector.

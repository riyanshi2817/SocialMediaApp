# Project Audit: AI Social Media Caption Generator

## Current architecture

This repository is a Node.js/Express backend with a minimal MongoDB + AI/image-storage setup. The actual app entry is `server.js`, which calls `src/app.js` and then connects to MongoDB via `src/db/db.js`.

Current structure:
- `server.js` starts the app and runs DB connection
- `src/app.js` mounts API routers
- `src/routes/` contains auth and post routes
- `src/controllers/` contains the logic for registration/login and post creation
- `src/models/` contains `user.model.js` and `post.model.js`
- `src/services/` contains AI caption generation and ImageKit upload logic
- `src/middlewares/auth.middleware.js` protects routes with JWT cookie auth
- No React frontend directory was found in the repository root

## Existing features

Based on current code inspection:
- User registration with bcrypt hashing
- User login with JWT token generation
- Cookie-based authentication using `req.cookies.token`
- Image upload via `multer.memoryStorage()`
- ImageKit upload integration
- Gemini-based caption generation from base64 image data
- Post creation that stores caption and image URL
- MongoDB persistence for users and posts

## Existing routes

API routes currently exposed:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/posts/` (protected route; expects uploaded image file)

No:
- logout route
- dashboard route
- caption history route
- user profile route
- update/delete post routes
- list/search routes
- frontend routes

## Existing models

### `user.model.js`
- Fields: `username` (unique, required), `password`
- Simple username/password model only
- No email, full name, avatar, social profile metadata, or role field

### `post.model.js`
- Fields: `image`, `caption`, `user`
- `user` references `User`
- `image` field is declared, but controller stores `imageUrl`, so data shape is inconsistent

## Existing services

### `src/services/ai.service.js`
- Uses `@google/generative-ai`
- Generates a caption from an uploaded image with Gemini
- Prompt asks for a short caption under 10 words with emojis and hashtags
- Functional integration exists, but it is limited to a single caption style and a single hardcoded prompt

### `src/services/storage.service.js`
- Uses `imagekit` and `@imagekit/nodejs`
- Uploads file buffer to ImageKit with folder `cohort-ai-social`
- This is a working integration pattern, but it depends on environment variables that are not documented consistently

## Existing dependencies

Installed dependencies from `package.json` and `package-lock.json` include:
- `express`
- `mongoose`
- `jsonwebtoken`
- `bcryptjs`
- `cookie-parser`
- `multer`
- `dotenv`
- `uuid`
- `@google/generative-ai`
- `@google/genai`
- `imagekit`
- `@imagekit/nodejs`
- `nodemon`

Notable:
- There is no `react`, `react-dom`, `axios`, `tailwindcss`, or frontend build setup in the repository root
- The package has no `start` or `dev` script
- `main` is set to `index.js`, but the actual server entry is `server.js`

## Broken or incomplete areas

- No real frontend exists in the repository
- No `start`/`dev` scripts in `package.json`
- README describes a different project layout (`server/`, `client/`) that does not match the actual repo
- The app likely does not run as expected without setting environment variables manually
- `connectDB` uses `process.env.MONGODB_URI`, but README mentions `MONGO_URI`
- JWT secret is named `process.env.jwt_secret`, while most projects use uppercase `JWT_SECRET`
- `res.cookie("token", token)` does not configure `httpOnly`, `secure`, `sameSite`, or expiry
- No logout route or token clearing implementation
- No user session/profile retrieval endpoint
- No route to fetch caption history or user posts
- No validation layer for request inputs
- No middleware for CORS, helmet, rate limiting, or error handling
- `postModel` and `createPostController` use mismatched field names (`image` vs `imageUrl`)
- `authMiddleware` assumes `req.user` exists without checking for missing user after JWT verification
- `registerController` and `loginController` do not return useful user data in JSON responses
- No tests and no build pipeline were found

## Security concerns

- JWT secret is not normalized or documented consistently; the code uses `jwt_secret` instead of a standard env variable name
- Cookies are not set with security flags such as `httpOnly`, `sameSite`, and `secure`
- No CSRF protection is included
- No input validation or sanitization
- No password strength checks
- No role-based authorization beyond a single protected route
- No `helmet`, `cors`, or security middleware configured
- No `.env.example` or safe configuration documentation was found
- No API key handling best-practice file or pattern was visible beyond local `.env` use

## Documentation problems

The README is substantially outdated relative to the repository:
- It describes a `server/` folder and a `client/` folder, but the actual repo root has `src/` and no frontend project
- It references setup instructions that do not match the real structure
- It says the frontend is under development, but the repository currently has no frontend code at all
- It says the backend is functional, but there is no `npm start` script or validated run command
- It includes environment variable names that do not match the current app (`MONGO_URI` vs `MONGODB_URI`)

## Recommended implementation phases

1. Stabilize the backend foundation
   - fix env variable naming
   - add proper start scripts and health checks
   - standardize API responses and errors

2. Rework the core product model
   - add caption history, user profile, and post management endpoints
   - align schema fields and controller logic
   - add validation and authorization rules

3. Build the frontend
   - create a React + Tailwind app
   - set up authentication, upload flow, dashboard, and caption results UI
   - add loading/error/empty states

4. Add AI and storage workflow polish
   - allow multiple tones/styles
   - improve caption generation prompts and user options
   - store generated captions and metadata in MongoDB

5. Harden security and deployment
   - secure cookies
   - enforce JWT verification on protected endpoints
   - add env validation and deployment docs

## Exact next steps

1. Replace the outdated README with project-specific documentation that matches the actual repo.
2. Add correct scripts in `package.json` (`start`, `dev`, optional `nodemon`).
3. Standardize environment variables (`MONGODB_URI`, `JWT_SECRET`, `IMAGEKIT_*`, `GEMINI_API_KEY`).
4. Audit and fix the auth flow, cookie security, and middleware behavior.
5. Decide on a single, consistent data model for users and posts.
6. Create the React frontend and add API integration via Axios.
7. Build out dashboard, history, and management features.
8. Add a testing and validation layer before broader feature work.
9. Keep the project focused on the AI caption generator product rather than the original generic social media app concept.

## Status summary

This repository already contains a promising backend foundation for an AI caption generator, but it is still an early prototype rather than a polished MERN application. The main gaps are frontend absence, inconsistent environment/config naming, incomplete API surface, and security hardening work.

STATUS:
AUDIT COMPLETE

Checklist of inspected files:
- `package.json`
- `package-lock.json`
- `server.js`
- `src/app.js`
- `src/db/db.js`
- `src/controllers/auth.controller.js`
- `src/controllers/post.controller.js`
- `src/models/user.model.js`
- `src/models/post.model.js`
- `src/routes/auth.routes.js`
- `src/routes/post.routes.js`
- `src/middlewares/auth.middleware.js`
- `src/services/ai.service.js`
- `src/services/storage.service.js`
- `README.md`
- `.gitignore`

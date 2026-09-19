# Backend Setup

## Prerequisites

- Node.js 18+
- MongoDB Atlas or a local MongoDB instance
- A valid `MONGO_URI` for the current backend
- A valid `JWT_SECRET`
- ImageKit credentials if using the image upload flow
- Gemini API key if using AI caption generation

## Install

```bash
cd server
npm install
```

## Environment variables

Create `server/.env` using `server/.env.example`. Do not commit real secrets.

```env
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
GEMINI_API_KEY=your_gemini_api_key
```

## Development

```bash
cd server
npm run dev
```

## Production / start

```bash
cd server
npm start
```

## Health endpoint

```http
GET /api/health
```

Example response:

```json
{
  "success": true,
  "message": "API is running"
}
```

## API base path

Current backend base paths:

- `/api/auth`
- `/api/posts`

## Post endpoints

- `GET /api/posts?page=1&limit=10&search=travel` - authenticated user's posts, newest first, with pagination and optional caption search
- `POST /api/posts` - authenticated image upload, ImageKit storage, AI caption generation, and post creation
- `GET /api/posts/summary` - authenticated user's post count and latest post date
- `GET /api/posts/:id` - authenticated owner retrieves one post
- `PATCH /api/posts/:id` - authenticated owner edits a caption
- `DELETE /api/posts/:id` - authenticated owner deletes a post

## MongoDB requirement

The backend currently requires a valid MongoDB connection string in `MONGO_URI` before startup can complete successfully. If the local environment does not include the required credentials, the server will fail to connect to MongoDB and the application will not fully start.

## Known limitations

- The React frontend is in `client/` and uses `VITE_API_URL` for the backend API base URL.
- ImageKit asset deletion is not attempted because posts do not store a reliable ImageKit file identifier.
- No test suite was added yet
- Deeper security hardening remains outside the completed integration phase.


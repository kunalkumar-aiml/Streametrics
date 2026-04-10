# OTT Platform Database Management System (DBMS Mini Project)

## Overview
This project is a university-grade mini DBMS implementation of an OTT platform similar to Netflix/Prime Video using:
- **Backend:** Node.js + Express
- **Database:** MySQL
- **Frontend:** HTML, CSS, JavaScript

It demonstrates relational modeling, normalization, foreign keys, joins, triggers, indexes, stored procedures, and API integration.

## Modules Implemented
1. **Login System** with fixed credentials (`9341806005` / `9341806005`)
2. **Movie Catalog** with random seeded movies
3. **Watch History** logging on movie click
4. **Notification System**
   - Inactive user notification
   - New movie insertion notification
5. **Dashboard** with trending, watch history, and notifications

## Database Design (10 Tables)
1. `users`
2. `movies`
3. `watch_history`
4. `notifications`
5. `genres`
6. `movie_genres`
7. `login_activity`
8. `favorites`
9. `subscriptions`
10. `recommendations`

All relationships are normalized and connected via primary/foreign keys.

## Advanced DBMS Features
- **Indexes** on high-traffic columns (`watch_history`, `notifications`, `movies`)
- **Triggers**:
  - `trg_new_movie_notification`: inserts notification when a new movie is added
  - `trg_inactive_user_alert`: inserts inactivity warning after long login gap
  - `trg_sync_last_login`: syncs `users.last_login`
- **Stored Procedure**:
  - `seed_random_movies(movie_count)` for automatic random movie generation
- **JOIN Queries** included in `database_setup.sql`

## API Endpoints
- `POST /api/login`
- `GET /api/movies`
- `POST /api/watch`
- `GET /api/watch-history?user_id=...`
- `GET /api/notifications?user_id=...`

## ER Diagram
- Source: `docs/er_diagram.mmd`
- Output image: `docs/ER_diagram.png`

## How to Run
1. Create database schema by executing:
   - `database/database_setup.sql`
2. Configure backend env:
   - copy `backend/.env.example` to `backend/.env`
3. Install backend dependencies and run server:
   - `cd backend && npm install && npm start`
4. Open `frontend/login.html` (or `http://localhost:5000/login.html` served by backend)

## Group Credit
- Name: Yash Raj | Reg No: RA2411026010746
- Name: Kunal Kumar | Reg No: RA2411026010747

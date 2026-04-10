-- OTT Platform DBMS Mini Project
-- Database: MySQL 8+

DROP DATABASE IF EXISTS ott_platform_db;
CREATE DATABASE ott_platform_db;
USE ott_platform_db;

-- 1) USERS
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE,
    last_login DATETIME NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) MOVIES
CREATE TABLE movies (
    movie_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    release_year YEAR NOT NULL,
    duration INT NOT NULL,
    rating DECIMAL(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
    description TEXT,
    poster_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user INT NULL,
    CONSTRAINT fk_movies_created_by FOREIGN KEY (created_by_user) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- 3) GENRES
CREATE TABLE genres (
    genre_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE
);

-- 4) MOVIE_GENRES (M:N)
CREATE TABLE movie_genres (
    movie_id INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (movie_id, genre_id),
    CONSTRAINT fk_movie_genres_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_movie_genres_genre FOREIGN KEY (genre_id) REFERENCES genres(genre_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 5) WATCH_HISTORY
CREATE TABLE watch_history (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    watch_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    progress_percent TINYINT DEFAULT 100,
    CONSTRAINT fk_watch_history_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_watch_history_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6) NOTIFICATIONS
CREATE TABLE notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    type ENUM('inactive_user', 'new_movie', 'general') NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 7) LOGIN_ACTIVITY
CREATE TABLE login_activity (
    login_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    login_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    device_info VARCHAR(255),
    success BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_login_activity_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 8) FAVORITES
CREATE TABLE favorites (
    favorite_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_favorites_user_movie (user_id, movie_id),
    CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_favorites_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 9) SUBSCRIPTIONS
CREATE TABLE subscriptions (
    subscription_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_name ENUM('Basic', 'Standard', 'Premium') NOT NULL DEFAULT 'Standard',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active', 'inactive', 'expired') NOT NULL DEFAULT 'active',
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 10) RECOMMENDATIONS
CREATE TABLE recommendations (
    recommendation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_recommendations_user_movie (user_id, movie_id),
    CONSTRAINT fk_recommendations_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_recommendations_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_movies_release_year ON movies(release_year);
CREATE INDEX idx_movies_rating ON movies(rating);
CREATE INDEX idx_watch_history_user_time ON watch_history(user_id, watch_timestamp);
CREATE INDEX idx_login_activity_user_time ON login_activity(user_id, login_timestamp);
CREATE INDEX idx_notifications_user_time ON notifications(user_id, created_at);

-- Seed user with required login credentials
INSERT INTO users (username, password_hash, full_name, email, last_login)
VALUES ('9341806005', SHA2('9341806005', 256), 'Demo OTT User', 'demo.user@ott.local', NOW());

INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, status)
VALUES (1, 'Premium', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'active');

-- Seed genres
INSERT INTO genres (name) VALUES
('Action'), ('Drama'), ('Thriller'), ('Sci-Fi'), ('Comedy'),
('Romance'), ('Crime'), ('Adventure'), ('Animation'), ('Fantasy');

DELIMITER $$

-- Trigger: New movie notification for all active users
CREATE TRIGGER trg_new_movie_notification
AFTER INSERT ON movies
FOR EACH ROW
BEGIN
    INSERT INTO notifications (user_id, type, message)
    SELECT u.user_id,
           'new_movie',
           'A new movie has been added to the platform. Check it now!'
    FROM users u
    WHERE u.is_active = TRUE;
END $$

-- Trigger: Inactive user alert on login after long inactivity
CREATE TRIGGER trg_inactive_user_alert
AFTER INSERT ON login_activity
FOR EACH ROW
BEGIN
    DECLARE previous_login DATETIME;

    SELECT MAX(la.login_timestamp)
      INTO previous_login
    FROM login_activity la
    WHERE la.user_id = NEW.user_id
      AND la.login_id <> NEW.login_id
      AND la.success = TRUE;

    IF previous_login IS NOT NULL AND DATEDIFF(NEW.login_timestamp, previous_login) >= 30 THEN
        INSERT INTO notifications (user_id, type, message)
        VALUES (
            NEW.user_id,
            'inactive_user',
            'You have not used this OTT platform for many days. You may uninstall the app as it is consuming storage unnecessarily.'
        );
    END IF;
END $$

-- Trigger: Keep users.last_login synchronized
CREATE TRIGGER trg_sync_last_login
AFTER INSERT ON login_activity
FOR EACH ROW
BEGIN
    IF NEW.success = TRUE THEN
        UPDATE users SET last_login = NEW.login_timestamp WHERE user_id = NEW.user_id;
    END IF;
END $$

-- Stored Procedure: insert random movies
CREATE PROCEDURE seed_random_movies(IN movie_count INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE picked_title VARCHAR(200);
    DECLARE picked_description TEXT;
    DECLARE picked_year YEAR;
    DECLARE picked_duration INT;
    DECLARE picked_rating DECIMAL(3,1);
    DECLARE picked_poster VARCHAR(500);
    DECLARE g1 INT;
    DECLARE g2 INT;

    WHILE i <= movie_count DO
        SET picked_title = ELT(
            FLOOR(1 + RAND() * 20),
            'Shadow Protocol', 'Neon Skies', 'Crimson Orbit', 'Silent Voltage', 'The Last Heist',
            'Echoes of Tomorrow', 'Midnight Frontier', 'Blue Horizon', 'Quantum Drift', 'Final Broadcast',
            'Gravity of Lies', 'Rogue Frequency', 'City of Embers', 'Glass Kingdom', 'Parallel Hearts',
            'Night Circuit', 'Astra Code', 'The Seventh Room', 'Darkwater Files', 'Phoenix Reloaded'
        );

        SET picked_description = ELT(
            FLOOR(1 + RAND() * 10),
            'A gripping journey where ambition clashes with destiny in a futuristic world.',
            'An elite team races against time to stop a global cyber threat.',
            'A deeply emotional story of friendship, betrayal, and second chances.',
            'A mysterious signal from space changes humanity forever.',
            'An undercover mission unravels a dangerous conspiracy.',
            'A family faces impossible choices during a city-wide blackout.',
            'Two strangers team up for one last impossible mission.',
            'An AI experiment goes wrong and rewrites reality.',
            'A legendary detective returns for his toughest case.',
            'A young hero discovers a power hidden across generations.'
        );

        SET picked_year = FLOOR(2014 + RAND() * 13);
        SET picked_duration = FLOOR(90 + RAND() * 70);
        SET picked_rating = ROUND(6 + RAND() * 4, 1);
        SET picked_poster = CONCAT('https://picsum.photos/seed/ott', FLOOR(RAND() * 10000), '/500/750');

        INSERT INTO movies (title, release_year, duration, rating, description, poster_url, created_by_user)
        VALUES (CONCAT(picked_title, ' #', FLOOR(RAND() * 900 + 100)), picked_year, picked_duration, picked_rating, picked_description, picked_poster, 1);

        SET g1 = FLOOR(1 + RAND() * 10);
        SET g2 = FLOOR(1 + RAND() * 10);

        INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES (LAST_INSERT_ID(), g1);
        INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES (LAST_INSERT_ID(), g2);

        SET i = i + 1;
    END WHILE;
END $$

DELIMITER ;

-- Auto-seed 10 random movies at setup time
CALL seed_random_movies(10);

-- Sample academic queries (JOINs + analytics)
-- 1. Top watched movies
SELECT m.title, COUNT(wh.history_id) AS total_watches
FROM movies m
LEFT JOIN watch_history wh ON m.movie_id = wh.movie_id
GROUP BY m.movie_id, m.title
ORDER BY total_watches DESC
LIMIT 10;

-- 2. User-wise watch history
SELECT u.username, m.title, wh.watch_timestamp
FROM watch_history wh
JOIN users u ON wh.user_id = u.user_id
JOIN movies m ON wh.movie_id = m.movie_id
ORDER BY wh.watch_timestamp DESC;

-- 3. Movie catalog with genres
SELECT m.movie_id, m.title, GROUP_CONCAT(g.name SEPARATOR ', ') AS genres, m.rating
FROM movies m
LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
LEFT JOIN genres g ON mg.genre_id = g.genre_id
GROUP BY m.movie_id, m.title, m.rating
ORDER BY m.rating DESC;

-- 4. Notifications per user
SELECT u.username, n.type, n.message, n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.user_id
ORDER BY n.created_at DESC;

-- 5. Recommendations with movie details
SELECT r.user_id, u.username, m.title, r.score, r.reason
FROM recommendations r
JOIN users u ON r.user_id = u.user_id
JOIN movies m ON r.movie_id = m.movie_id
ORDER BY r.score DESC;

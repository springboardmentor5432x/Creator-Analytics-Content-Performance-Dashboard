-- PostgreSQL version of the Module 1 schema (SQLAlchemy creates this automatically)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(30) UNIQUE NOT NULL
);
INSERT INTO roles (name) VALUES ('creator'),('agency'),('marketing_team'),('admin');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE creator_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100), bio TEXT, niche VARCHAR(60), primary_platform VARCHAR(30)
);

CREATE TABLE agency_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_name VARCHAR(150), website VARCHAR(255), description TEXT
);

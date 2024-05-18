CREATE DATABASE CRYPTO_BOT;

CREATE ROLE crypto_user LOGIN PASSWORD '123123';
CREATE ROLE crypto_admin LOGIN PASSWORD '123123';

CREATE TABLE Users (
    id NUMERIC PRIMARY KEY,
    name VARCHAR(255),
    wallet VARCHAR(255) UNIQUE,
    ref_id NUMERIC DEFAULT 0,
    ref_points INTEGER DEFAULT 0 NOT NULL,
    lesson_points INTEGER DEFAULT 0 NOT NULL,
    task_points INTEGER DEFAULT 0 NOT NULL
);

drop view USERS_LIST;
-- CREATE VIEW USERS_LIST AS
-- SELECT * FROM USERS WHERE wallet <> NULL OR wallet <> '';

ALTER TABLE Users
ADD CONSTRAINT unique_wallet UNIQUE (wallet);

--изменена
drop function get_all_users;
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF USERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM USERS;
END;
$$ LANGUAGE plpgsql;

drop function get_user;
CREATE OR REPLACE FUNCTION get_user(input_user_id NUMERIC)
RETURNS SETOF USERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM USERS WHERE id = input_user_id;
END;
$$ LANGUAGE plpgsql;

--изменено
drop function get_users_by_wallet;
CREATE OR REPLACE FUNCTION get_users_by_wallet(input_wallet VARCHAR)
RETURNS SETOF USERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM USERS WHERE wallet = input_wallet;
END;
$$ LANGUAGE plpgsql;

--изменено
drop function search_users;
CREATE OR REPLACE FUNCTION search_users(search_text TEXT)
RETURNS TABLE (
    ID NUMERIC,
    name VARCHAR(255),
    wallet VARCHAR(255),
    ref_id NUMERIC
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        USERS.id, 
        USERS.name, 
        USERS.wallet, 
        USERS.ref_id
    FROM 
        USERS
    WHERE
        (USERS.name ILIKE '%' || search_text || '%')
        OR (USERS.wallet ILIKE '%' || search_text || '%')
        OR (USERS.id::TEXT ILIKE '%' || search_text || '%');
END;
$$ LANGUAGE plpgsql;

--изменено
drop function get_user_referrals;
CREATE OR REPLACE FUNCTION get_user_referrals(input_user_id NUMERIC)
RETURNS SETOF USERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM USERS WHERE ref_id = input_user_id AND wallet <> '' AND wallet IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

drop function update_user_wallet;
CREATE OR REPLACE FUNCTION update_user_wallet(input_user_id NUMERIC, new_wallet VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Users WHERE id = input_user_id) THEN
        RAISE EXCEPTION 'This user does not exist';
    END IF;

    UPDATE Users SET wallet = new_wallet WHERE id = input_user_id;
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

drop function add_user;
CREATE OR REPLACE FUNCTION add_user(input_id NUMERIC, input_name VARCHAR, input_wallet VARCHAR, input_ref_id NUMERIC DEFAULT 0)
RETURNS NUMERIC AS $$
DECLARE
    new_user_id NUMERIC;
BEGIN
    IF EXISTS (SELECT 1 FROM Users WHERE id = input_id) THEN
        RAISE EXCEPTION 'User with this id exists';
    END IF;

    IF input_id = input_ref_id THEN
        input_ref_id := null;
    END IF;

    INSERT INTO Users (id, name, wallet, ref_id) VALUES (input_id, input_name, input_wallet, input_ref_id) RETURNING id INTO new_user_id;

    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'Error adding a user';
    END IF;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

drop function get_wallets;
CREATE OR REPLACE FUNCTION get_wallets()
RETURNS TABLE(wallet VARCHAR(255)) AS $$
BEGIN
    RETURN QUERY SELECT USERS.wallet FROM Users WHERE Users.wallet IS NOT NULL AND Users.wallet != '';
END;
$$ LANGUAGE plpgsql;



CREATE TABLE Lessons (
    id NUMERIC PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    text TEXT NOT NULL
);

--Добавление урока
CREATE OR REPLACE FUNCTION add_lesson(
    p_name VARCHAR,
    p_text TEXT
) RETURNS NUMERIC AS $$
DECLARE
    v_id NUMERIC;
BEGIN
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        RAISE EXCEPTION 'Lesson name cannot be null or empty';
    END IF;
    
    IF p_text IS NULL OR LENGTH(TRIM(p_text)) = 0 THEN
        RAISE EXCEPTION 'Lesson text cannot be null or empty';
    END IF;

    IF EXISTS (SELECT 1 FROM Lessons WHERE name = p_name) THEN
        RAISE EXCEPTION 'Lesson with name % already exists', p_name;
    END IF;

    INSERT INTO Lessons (name, text) 
    VALUES (p_name, p_text)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

--Удаление урока
CREATE OR REPLACE FUNCTION delete_lesson(
    p_id NUMERIC
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_id IS NULL THEN
        RAISE EXCEPTION 'Lesson id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Lessons WHERE id = p_id) THEN
        RAISE EXCEPTION 'Lesson with id % does not exist', p_id;
    END IF;

    DELETE FROM Lessons WHERE id = p_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

--Редактирование урока
CREATE OR REPLACE FUNCTION edit_lesson(
    p_id NUMERIC,
    p_name VARCHAR,
    p_text TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_id IS NULL THEN
        RAISE EXCEPTION 'Lesson id cannot be null';
    END IF;

    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        RAISE EXCEPTION 'Lesson name cannot be null or empty';
    END IF;
    
    IF p_text IS NULL OR LENGTH(TRIM(p_text)) = 0 THEN
        RAISE EXCEPTION 'Lesson text cannot be null or empty';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Lessons WHERE id = p_id) THEN
        RAISE EXCEPTION 'Lesson with id % does not exist', p_id;
    END IF;

    UPDATE Lessons 
    SET name = p_name, text = p_text 
    WHERE id = p_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

--Получение одного урока
CREATE OR REPLACE FUNCTION get_lesson(
    p_id NUMERIC
) RETURNS SETOF Lesson AS $$
BEGIN
    IF p_id IS NULL THEN
        RAISE EXCEPTION 'Lesson id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Lessons WHERE id = p_id) THEN
        RAISE EXCEPTION 'Lesson with id % does not exist', p_id;
    END IF;

    RETURN QUERY
    SELECT *
    FROM Lessons 
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

--Получение всех уроков
CREATE OR REPLACE FUNCTION get_all_lessons()
 RETURNS SETOF Lessons AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM Lessons;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE ADMINS (
    id SERIAL PRIMARY KEY,
    login VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);

INSERT INTO ADMINS(login, password) VALUES ('andrey_ksa', '123123');

CREATE OR REPLACE FUNCTION auth_admin(
    p_login VARCHAR(100),
    p_password VARCHAR(100)
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_login = '' OR p_login = null OR p_password = '' OR p_password = null THEN
        RAISE EXCEPTION 'Login and password cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ADMINS WHERE ADMINS.login = p_login AND ADMINS.password = p_password) THEN
        RAISE EXCEPTION 'Invalid login or password';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


CREATE TABLE TASKS (
    ID SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    text TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE CONFIRM_TASKS (
    ID SERIAL PRIMARY KEY,
    TASK_ID INTEGER NOT NULL FOREIGN KEY TASKS(ID),
    USER_ID NUMERIC NOT NULL FOREIGN KEY USERS(ID)
);

CREATE OR REPLACE FUNCTION add_task(
    p_name VARCHAR,
    p_text TEXT,
    p_points INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    v_id INTEGER;
BEGIN
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        RAISE EXCEPTION 'Task name cannot be null or empty';
    END IF;
    
    IF p_text IS NULL OR LENGTH(TRIM(p_text)) = 0 THEN
        RAISE EXCEPTION 'Task text cannot be null or empty';
    END IF;

    IF EXISTS (SELECT 1 FROM TASKS WHERE name = p_name) THEN
        RAISE EXCEPTION 'Task with name % already exists', p_name;
    END IF;

    INSERT INTO TASKS (name, text, points) 
    VALUES (p_name, p_text, p_points)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_task(
    p_id INTEGER
) RETURNS TABLE (
    ID INTEGER,
    NAME VARCHAR(100),
    TEXT TEXT,
    POINTS INTEGER,
    COUNT INTEGER,
    IS_DELETED BOOLEAN
) AS $$
BEGIN
    IF p_id IS NULL THEN
        RAISE EXCEPTION 'Task id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM TASKS WHERE TASKS.id = p_id) THEN
        RAISE EXCEPTION 'Task with id % does not exist', p_id;
    END IF;

    RETURN QUERY
    SELECT 
        TASKS.id, 
        TASKS.name, 
        TASKS.text, 
        TASKS.points, 
        (SELECT COUNT(*)::INTEGER FROM CONFIRM_TASKS WHERE CONFIRM_TASKS.task_id = TASKS.id) AS count,
        TASKS.is_deleted
    FROM 
        TASKS 
    WHERE 
        TASKS.id = p_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_task(
    p_id INTEGER,
    p_status BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_id IS NULL THEN
        RAISE EXCEPTION 'Task id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM TASKS WHERE id = p_id) THEN
        RAISE EXCEPTION 'Task with id % does not exist', p_id;
    END IF;

    UPDATE TASKS SET is_deleted = p_status WHERE id = p_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION accept_task(
    p_user_id NUMERIC, 
    p_task_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    added_points INTEGER;
BEGIN
    BEGIN
        IF p_user_id IS NULL OR p_task_id IS NULL THEN
            RAISE EXCEPTION 'Task id or user id cannot be null';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM Users WHERE id = p_user_id) THEN
            RAISE EXCEPTION 'User with id % does not exist', p_user_id;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM TASKS WHERE id = p_task_id) THEN
            RAISE EXCEPTION 'Task with id % does not exist', p_task_id;
        END IF;

        SELECT points INTO added_points FROM TASKS WHERE id = p_task_id;

        UPDATE USERS SET task_points = task_points + added_points WHERE id = p_user_id;

        INSERT INTO CONFIRM_TASKS (TASK_ID, USER_ID) VALUES (p_task_id, p_user_id);

        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE;
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_completed_tasks(
    p_user_id NUMERIC
) RETURNS TABLE (
    ID INTEGER,
    NAME VARCHAR(100),
    USER_ID NUMERIC
) AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Users WHERE Users.id = p_user_id) THEN
        RAISE EXCEPTION 'User with id % does not exist', p_user_id;
    END IF;

    RETURN QUERY
    SELECT TASKS.ID, TASKS.name, CONFIRM_TASKS.USER_ID
        FROM CONFIRM_TASKS
    INNER JOIN TASKS ON TASKS.ID = CONFIRM_TASKS.TASK_ID
    WHERE CONFIRM_TASKS.USER_ID = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_tasks(
    p_user_id NUMERIC
) RETURNS TABLE(
    ID INTEGER,
    NAME VARCHAR(100)
) AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Users WHERE Users.id = p_user_id) THEN
        RAISE EXCEPTION 'User with id % does not exist', p_user_id;
    END IF;

    RETURN QUERY
    SELECT TASKS.ID, TASKS.NAME
    FROM TASKS 
    WHERE TASKS.id NOT IN (SELECT CONFIRM_TASKS.TASK_ID FROM CONFIRM_TASKS WHERE CONFIRM_TASKS.USER_ID = p_user_id) AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION add_points_to_referrer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wallet IS NOT NULL AND NEW.wallet <> '' AND (OLD.wallet IS NULL OR OLD.wallet = '') THEN
        IF NEW.ref_id IS NOT NULL AND NEW.ref_id <> 0 THEN
            UPDATE Users
            SET ref_points = ref_points + 10
            WHERE id = NEW.ref_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_set_trigger
AFTER UPDATE OF wallet
ON Users
FOR EACH ROW
EXECUTE FUNCTION add_points_to_referrer();


GRANT SELECT, INSERT, UPDATE ON TABLE TASKS TO crypto_admin;
GRANT SELECT ON TABLE TASKS TO crypto_user;

GRANT SELECT, INSERT, UPDATE ON TABLE CONFIRM_TASKS TO crypto_admin;
GRANT SELECT, INSERT ON TABLE CONFIRM_TASKS to crypto_user;

GRANT USAGE, SELECT ON SEQUENCE confirm_tasks_id_seq TO crypto_user;
GRANT USAGE, SELECT ON SEQUENCE confirm_tasks_id_seq TO crypto_admin;

GRANT USAGE, SELECT ON SEQUENCE tasks_id_seq TO crypto_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE tasks_id_seq TO crypto_admin;

GRANT EXECUTE ON FUNCTION get_user(NUMERIC) TO crypto_user;
GRANT EXECUTE ON FUNCTION get_user_referrals(NUMERIC) TO crypto_user;
GRANT EXECUTE ON FUNCTION update_user_wallet(NUMERIC, VARCHAR) TO crypto_user;
GRANT EXECUTE ON FUNCTION add_user(NUMERIC, VARCHAR, VARCHAR, NUMERIC) TO crypto_user;

GRANT EXECUTE ON FUNCTION get_wallets() TO crypto_admin;
GRANT EXECUTE ON FUNCTION get_all_users() TO crypto_admin;
GRANT EXECUTE ON FUNCTION get_user(NUMERIC) TO crypto_admin;
GRANT EXECUTE ON FUNCTION get_users_by_wallet(VARCHAR) TO crypto_admin;
GRANT EXECUTE ON FUNCTION get_users_by_name(VARCHAR) TO crypto_admin;
GRANT EXECUTE ON FUNCTION get_user_referrals(NUMERIC) TO crypto_admin;
GRANT EXECUTE ON FUNCTION update_user_wallet(NUMERIC, VARCHAR) TO crypto_admin;
GRANT EXECUTE ON FUNCTION add_user(NUMERIC, VARCHAR, VARCHAR, NUMERIC) TO crypto_admin;
GRANT EXECUTE ON FUNCTION search_users(TEXT) TO crypto_admin;


GRANT SELECT, UPDATE, INSERT ON TABLE Users TO crypto_user;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE Users TO crypto_admin;

GRANT SELECT ON USERS_LIST TO crypto_admin;
GRANT SELECT ON USERS_LIST TO crypto_user;

GRANT SELECT ON TABLE ADMINS TO crypto_admin;

CREATE OR REPLACE FUNCTION get_task_users(p_task_id INTEGER)
RETURNS TABLE(
    ID NUMERIC,
    NAME VARCHAR(255)
)
AS $$
BEGIN
    IF p_task_id IS NULL THEN
        RAISE EXCEPTION 'Task id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM TASKS WHERE TASKS.id = p_task_id) THEN
        RAISE EXCEPTION 'Task with id % does not exist', p_task_id;
    END IF;

    RETURN QUERY
    SELECT 
        Users.id,
        Users.name
    FROM 
        Users
    INNER JOIN 
        CONFIRM_TASKS ON CONFIRM_TASKS.USER_ID = Users.id
    WHERE 
        CONFIRM_TASKS.TASK_ID = p_task_id;
END;
$$ LANGUAGE plpgsql;

--индексы
CREATE INDEX idx_users_wallet ON Users(wallet);

CREATE INDEX idx_users_ref_id ON Users(ref_id);

CREATE INDEX idx_tasks_is_deleted ON Tasks(is_deleted);

CREATE INDEX idx_confirm_tasks_task_id ON CONFIRM_TASKS(task_id);

CREATE INDEX idx_confirm_tasks_user_id ON CONFIRM_TASKS(user_id);

CREATE INDEX idx_users_name ON Users(name);
CREATE INDEX idx_users_id ON Users(id);

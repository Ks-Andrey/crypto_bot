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
    task_points INTEGER DEFAULT 0 NOT NULL,
    reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

drop view USERS_LIST;

ALTER TABLE Users
ADD CONSTRAINT unique_wallet UNIQUE (wallet);

--изменено
drop function get_all_users;
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF USERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM USERS ORDER BY reg_date DESC;
END;
$$ LANGUAGE plpgsql;

drop function get_user;
CREATE OR REPLACE FUNCTION get_user(input_user_id NUMERIC)
RETURNS SETOF USERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM USERS WHERE id = input_user_id;
END;
$$ LANGUAGE plpgsql;

drop function get_users_by_wallet;
CREATE OR REPLACE FUNCTION get_users_by_wallet(input_wallet VARCHAR)
RETURNS SETOF USERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM USERS WHERE wallet = input_wallet;
END;
$$ LANGUAGE plpgsql;

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

    IF EXISTS (SELECT 1 FROM USERS WHERE wallet = new_wallet AND id <> input_user_id) THEN
        RAISE EXCEPTION 'Wallet already in use' USING ERRCODE = 'P0001';
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

--изменено
CREATE OR REPLACE FUNCTION get_top_users(
    input_user_id NUMERIC = NULL,
    input_admin_id NUMERIC = NULL
)
RETURNS TABLE (
    place BIGINT,
    user_id NUMERIC,
    name VARCHAR(255),
    total_points INTEGER
) AS $$
BEGIN
    IF input_user_id IS NULL THEN
        RETURN QUERY
        WITH UserPoints AS (
            SELECT 
                Users.id,
                Users.name,
                (Users.ref_points + Users.lesson_points + Users.task_points)::INTEGER AS total_points
            FROM Users
            WHERE Users.id <> input_admin_id
        ),
        RankedUsers AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY UserPoints.total_points DESC) AS place,
                UserPoints.id AS user_id,
                UserPoints.name,
                UserPoints.total_points
            FROM UserPoints
            ORDER BY total_points DESC
            LIMIT 10
        )
        SELECT * FROM RankedUsers;
    ELSE
        RETURN QUERY
        WITH UserPoints AS (
            SELECT 
                Users.id,
                Users.name,
                (Users.ref_points + Users.lesson_points + Users.task_points)::INTEGER AS total_points
            FROM Users
            WHERE Users.id <> input_admin_id
        ),
        RankedUsers AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY UserPoints.total_points DESC) AS place,
                UserPoints.id AS user_id,
                UserPoints.name,
                UserPoints.total_points
            FROM UserPoints
            ORDER BY UserPoints.total_points DESC
        ),
        TopUsers AS ( SELECT * FROM RankedUsers LIMIT 10 )
        SELECT * FROM TopUsers
        UNION ALL
        SELECT * FROM RankedUsers WHERE RankedUsers.user_id = input_user_id
        AND RankedUsers.user_id NOT IN (SELECT TopUsers.user_id FROM TopUsers);
    END IF;
END;
$$ LANGUAGE plpgsql;

--изменено
CREATE OR REPLACE FUNCTION get_top_users_by_refs(
    input_user_id NUMERIC = NULL,
    input_admin_id NUMERIC = NULL
)
RETURNS TABLE (
    place BIGINT,
    user_id NUMERIC,
    name VARCHAR(255),
    referral_count BIGINT 
) AS $$
BEGIN
    IF input_user_id IS NULL THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER(ORDER BY (SELECT COUNT(*) FROM users AS ref_users WHERE ref_users.ref_id = users.id AND ref_users.wallet IS NOT NULL AND ref_users.wallet <> '') DESC) AS place,
            users.id AS user_id, 
            users.name, 
            (SELECT COUNT(*) FROM users AS ref_users WHERE ref_users.ref_id = users.id AND ref_users.wallet IS NOT NULL AND ref_users.wallet <> '') AS referral_count 
        FROM users
        WHERE users.id <> input_admin_id
        ORDER BY referral_count DESC
        LIMIT 10;
    ELSE
        RETURN QUERY
        WITH UserRefs AS (
            SELECT
                users.id as user_id, 
                users.name, 
                (SELECT COUNT(*) FROM users AS ref_users WHERE ref_users.ref_id = users.id AND ref_users.wallet IS NOT NULL AND ref_users.wallet <> '') AS referral_count 
            FROM users
            WHERE users.id <> input_admin_id
        ), RankedUsers AS (
            SELECT
                ROW_NUMBER() OVER (ORDER BY UserRefs.referral_count DESC) AS place, 
                *
            FROM UserRefs
        ), TopUsers AS (
            SELECT * 
            FROM RankedUsers 
            ORDER BY RankedUsers.place 
            LIMIT 10
        )
        SELECT * FROM TopUsers
        UNION ALL
        SELECT * FROM RankedUsers 
        WHERE RankedUsers.user_id = input_user_id
        AND RankedUsers.user_id NOT IN (SELECT TopUsers.user_id FROM TopUsers);
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_top_users_by_refs(468407757);
select * from get_top_users(6451534002);

CREATE OR REPLACE FUNCTION get_all_statistics(
    input_admin_id NUMERIC
)
RETURNS TABLE (
    name TEXT,
    data BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'users count' AS name, count(*) from Users
    UNION
    SELECT 'referrals count' AS name, count(*) FROM Users WHERE Users.ref_id IS NOT NULL AND Users.ref_id <> input_admin_id
    UNION 
    SELECT 'lesson comlite count' AS name, count(*) FROM CONFIRM_LESSONS
    UNION 
    SELECT 'tasks complite count' AS name, count(*) FROM CONFIRM_TASKS;
END;
$$ LANGUAGE plpgsql;


CREATE TABLE Lessons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    type_id INTEGER NOT NULL DEFAULT 0,
    photo_path VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    points INTEGER
);

CREATE TABLE CONFIRM_LESSONS (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER FOREIGN KEY REFERENCES Lessons(id),
    user_id NUMERIC FOREIGN KEY REFERENCES Users(id)
);

CREATE OR REPLACE FUNCTION accept_lesson(
    p_user_id NUMERIC,
    p_lesson_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    i_points INTEGER;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User id cannot be null';
    END IF;
    
    IF p_lesson_id IS NULL THEN
        RAISE EXCEPTION 'Lesson id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Users WHERE Users.id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Lessons WHERE Lessons.id = p_lesson_id) THEN
        RAISE EXCEPTION 'Lesson not found';
    END IF;

    IF EXISTS (SELECT 1 FROM CONFIRM_LESSONS WHERE lesson_id = p_lesson_id AND user_id = p_user_id) THEN
        RETURN FALSE;
    END IF;

    SELECT Lessons.points INTO i_points FROM Lessons WHERE Lessons.id = p_lesson_id;

    INSERT INTO CONFIRM_LESSONS (lesson_id, user_id) 
    VALUES (p_lesson_id, p_user_id);

    UPDATE Users SET lesson_points = lesson_points + i_points WHERE Users.id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_lesson(
    p_name VARCHAR,
    p_text TEXT,
    p_type_id INTEGER,
    p_points INTEGER,
    p_path VARCHAR(255)
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
    
    IF p_type_id IS NULL THEN
        RAISE EXCEPTION 'Lesson type cannot be null or empty';
    END IF;

    IF p_points IS NULL THEN
        RAISE EXCEPTION 'Lesson points cannot be null or empty';
    END IF;

    IF EXISTS (SELECT 1 FROM Lessons WHERE name = p_name AND type_id = p_type_id) THEN
        RAISE EXCEPTION 'Lesson with name % already exists', p_name;
    END IF;

    INSERT INTO Lessons (name, text, type_id, points, photo_path) 
    VALUES (p_name, p_text, p_type_id, p_points, p_path)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_lesson(
    p_id NUMERIC,
    is_deleted BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_id IS NULL THEN
        RAISE EXCEPTION 'Lesson id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Lessons WHERE id = p_id) THEN
        RAISE EXCEPTION 'Lesson with id % does not exist', p_id;
    END IF;

    UPDATE Lessons SET is_deleted = delete_lesson.is_deleted WHERE id = p_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION edit_lesson;
CREATE OR REPLACE FUNCTION edit_lesson(
    p_id NUMERIC,
    p_name VARCHAR,
    p_text TEXT,
    p_photo_path VARCHAR(255),
    p_points INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_points IS NULL THEN 
        RAISE EXCEPTION 'Lesson points cannot be null';
    END IF;

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
    SET name = p_name, text = p_text, photo_path = p_photo_path, points = p_points
    WHERE id = p_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_lesson(
    p_id NUMERIC
) RETURNS SETOF Lessons AS $$
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

CREATE OR REPLACE FUNCTION get_all_lessons()
 RETURNS SETOF Lessons AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM Lessons
    ORDER BY ID ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_lessons(
    p_type_id INTEGER
)
 RETURNS SETOF Lessons AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM Lessons 
    WHERE is_deleted = FALSE AND type_id = p_type_id
    ORDER BY ID ASC;
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
    WHERE CONFIRM_TASKS.USER_ID = p_user_id
    ORDER BY TASKS.ID ASC;
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
    WHERE TASKS.id NOT IN (SELECT CONFIRM_TASKS.TASK_ID FROM CONFIRM_TASKS WHERE CONFIRM_TASKS.USER_ID = p_user_id) AND is_deleted = FALSE
    ORDER BY TASKS.ID ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_all_tasks()
RETURNS SETOF TASKS AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM TASKS
    ORDER BY ID ASC;
END;
$$ LANGUAGE plpgsql;


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

CREATE OR REPLACE FUNCTION add_points_to_referrer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wallet IS NOT NULL AND NEW.wallet <> '' AND (OLD.wallet IS NULL OR OLD.wallet = '') THEN
        IF NEW.ref_id IS NOT NULL AND NEW.ref_id <> 0 THEN
            UPDATE Users
            SET ref_points = ref_points + 500
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

GRANT SELECT ON TABLE TASKS TO crypto_user;
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

GRANT SELECT ON TABLE Lessons TO crypto_user;
GRANT SELECT, INSERT ON TABLE CONFIRM_LESSONS TO crypto_user;

GRANT USAGE, SELECT, UPDATE ON SEQUENCE lessons_id_seq TO crypto_admin;
GRANT USAGE, SELECT ON SEQUENCE lessons_id_seq TO crypto_user;
GRANT USAGE, SELECT ON SEQUENCE confirm_lessons_id_seq TO crypto_user;
GRANT USAGE, SELECT ON SEQUENCE confirm_lessons_id_seq TO crypto_admin;


GRANT SELECT, UPDATE, INSERT ON TABLE Users TO crypto_user;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE Users TO crypto_admin;

GRANT SELECT ON USERS_LIST TO crypto_admin;
GRANT SELECT ON USERS_LIST TO crypto_user;

GRANT SELECT ON TABLE ADMINS TO crypto_admin;

--индексы
CREATE INDEX idx_users_wallet ON Users(wallet);

CREATE INDEX idx_users_ref_id ON Users(ref_id);

CREATE INDEX idx_tasks_is_deleted ON Tasks(is_deleted);

CREATE INDEX idx_confirm_tasks_task_id ON CONFIRM_TASKS(task_id);

CREATE INDEX idx_confirm_tasks_user_id ON CONFIRM_TASKS(user_id);

CREATE INDEX idx_users_name ON Users(name);
CREATE INDEX idx_users_id ON Users(id);



CREATE TABLE USER_LISTS (
    ID SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE USER_LIST_DATA (
    ID SERIAL PRIMARY KEY,
    list_id INTEGER NOT NULL,
    user_id NUMERIC NOT NULL,
    FOREIGN KEY (list_id) REFERENCES USER_LISTS(ID)
);

DROP FUNCTION add_list;
CREATE OR REPLACE FUNCTION add_list(p_name VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    new_list_id INTEGER;
BEGIN
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        RAISE EXCEPTION 'List name cannot be empty';
    END IF;

    IF EXISTS (SELECT 1 FROM USER_LISTS WHERE name = p_name) THEN
        RAISE EXCEPTION 'Task with name % already exists', p_name;
    END IF;

    INSERT INTO USER_LISTS (name) VALUES (p_name) RETURNING ID INTO new_list_id;
    RETURN new_list_id;
END;
$$ LANGUAGE plpgsql;

--изменено
DROP FUNCTION add_user_to_list;
CREATE OR REPLACE FUNCTION add_user_to_list(p_list_id INTEGER, p_user_id NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_list_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'List ID and User ID cannot be NULL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Users WHERE Users.id = p_user_id) THEN
        RAISE EXCEPTION 'User ID % does not exist', p_user_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM USER_LISTS WHERE ID = p_list_id) THEN
        RAISE EXCEPTION 'List ID % does not exist', p_list_id;
    END IF;

    INSERT INTO USER_LIST_DATA (list_id, user_id) VALUES (p_list_id, p_user_id);
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

--новое
CREATE OR REPLACE FUNCTION add_users_to_list(
    p_list_id INTEGER,
    p_user_list NUMERIC[]
)
RETURNS BOOLEAN AS $$
DECLARE
    link_user_id NUMERIC;
BEGIN
    IF p_list_id IS NULL THEN 
        RAISE EXCEPTION 'List ID cannot be NULL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM USER_LISTS WHERE ID = p_list_id) THEN
        RAISE EXCEPTION 'List ID % does not exist', p_list_id;
    END IF;

    FOREACH link_user_id IN ARRAY p_user_list LOOP
        IF link_user_id IS NULL THEN
            RAISE EXCEPTION 'User ID cannot be NULL';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM Users WHERE Users.id = link_user_id) THEN
            RAISE EXCEPTION 'User ID % does not exist', link_user_id;
        END IF;

        INSERT INTO USER_LIST_DATA (list_id, user_id) VALUES (p_list_id, link_user_id);
    END LOOP;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'An error occurred: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

--изменено
DROP FUNCTION delete_user_from_list;
CREATE OR REPLACE FUNCTION delete_user_from_list(p_list_id INTEGER, p_user_id NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_list_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'List ID and User ID cannot be NULL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM USER_LIST_DATA WHERE list_id = p_list_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User ID % not found in List ID %', p_user_id, p_list_id;
    END IF;

    DELETE FROM USER_LIST_DATA WHERE list_id = p_list_id AND user_id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION get_users_from_list;
CREATE OR REPLACE FUNCTION get_users_from_list(p_list_id INTEGER)
RETURNS TABLE (
    id NUMERIC,
    name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY 
    SELECT USERS.id AS id, USERS.name AS name
    FROM USER_LIST_DATA INNER JOIN
    USERS ON USER_LIST_DATA.user_id = USERS.id
    WHERE list_id = p_list_id;
END;
$$ LANGUAGE plpgsql;

--изменено
DROP FUNCTION delete_list;
CREATE OR REPLACE FUNCTION delete_list(p_list_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_list_id IS NULL THEN
        RAISE EXCEPTION 'List ID cannot be NULL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM USER_LISTS WHERE ID = p_list_id) THEN
        RAISE EXCEPTION 'List ID % does not exist', p_list_id;
    END IF;

    DELETE FROM USER_LIST_DATA WHERE list_id = p_list_id;
    DELETE FROM USER_LISTS WHERE ID = p_list_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION get_all_lists;
CREATE OR REPLACE FUNCTION get_all_lists(p_user_id NUMERIC DEFAULT NULL)
RETURNS SETOF USER_LISTS AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN QUERY
        SELECT *
        FROM USER_LISTS
        ORDER BY ID ASC;
    ELSE
        RETURN QUERY
        SELECT *
        FROM USER_LISTS
        WHERE ID NOT IN (
            SELECT list_id
            FROM USER_LIST_DATA
            WHERE user_id = p_user_id
        )
        ORDER BY ID ASC;
    END IF;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE CONFIRM_LESSONS
ADD CONSTRAINT fk_lesson_id
FOREIGN KEY (lesson_id) REFERENCES Lessons(id)
ON DELETE CASCADE;

ALTER TABLE CONFIRM_LESSONS
ADD CONSTRAINT fk_user_id
FOREIGN KEY (user_id) REFERENCES Users(id)
ON DELETE CASCADE;

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE USER_LISTS TO crypto_admin;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE USER_LIST_DATA TO crypto_admin;

GRANT USAGE, SELECT, UPDATE ON SEQUENCE user_list_data_id_seq TO crypto_admin;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE user_lists_id_seq TO crypto_admin;

ALTER TABLE Lessons DROP CONSTRAINT unique_name;

DROP FUNCTION edit_task;
CREATE OR REPLACE FUNCTION edit_task(
    p_id NUMERIC,
    p_name VARCHAR,
    p_text TEXT,
    p_points INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_points IS NULL THEN
        RAISE EXCEPTION 'Task points cannot be null';
    END IF;

    IF p_id IS NULL THEN
        RAISE EXCEPTION 'Task id cannot be null';
    END IF;

    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        RAISE EXCEPTION 'Task name cannot be null or empty';
    END IF;
    
    IF p_text IS NULL OR LENGTH(TRIM(p_text)) = 0 THEN
        RAISE EXCEPTION 'Task text cannot be null or empty';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Tasks WHERE id = p_id) THEN
        RAISE EXCEPTION 'Lesson with id % does not exist', p_id;
    END IF;

    UPDATE Tasks 
    SET name = p_name, text = p_text, points = p_points
    WHERE id = p_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE USER_LISTS
ADD CONSTRAINT unique_list_name UNIQUE (name);

--изменено
CREATE OR REPLACE FUNCTION delete_full_task(p_task_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_task_id IS NULL THEN
        RAISE EXCEPTION 'Task id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM TASKS WHERE id = p_task_id) THEN
        RAISE EXCEPTION 'Task with id % does not exist', p_task_id;
    END IF;

    DELETE FROM CONFIRM_TASKS WHERE task_id = p_task_id;
    DELETE FROM TASKS WHERE id = p_task_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

--изменено
CREATE OR REPLACE FUNCTION delete_full_lesson(p_lesson_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_lesson_id IS NULL THEN
        RAISE EXCEPTION 'Lesson id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Lessons WHERE id = p_lesson_id) THEN
        RAISE EXCEPTION 'Lesson with id % does not exist', p_lesson_id;
    END IF;

    DELETE FROM CONFIRM_LESSONS WHERE lesson_id = p_lesson_id;

    DELETE FROM Lessons WHERE id = p_lesson_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE TASKS TO crypto_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE CONFIRM_TASKS TO crypto_admin;

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE Lessons TO crypto_admin;
GRANT SELECT, INSERT, DELETE ON TABLE CONFIRM_LESSONS TO crypto_admin;
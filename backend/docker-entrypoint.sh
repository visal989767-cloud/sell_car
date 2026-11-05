#!/bin/sh
set -eu

port="${PORT:-8080}"
case "$port" in
    ''|*[!0-9]*)
        echo "PORT must be a numeric TCP port." >&2
        exit 1
        ;;
esac

sed -i "s/Listen 80/Listen ${port}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${port}>/" /etc/apache2/sites-available/000-default.conf

if [ "${DB_AUTO_INIT:-false}" = "true" ]; then
    : "${DB_HOST:?DB_HOST is required when DB_AUTO_INIT=true}"
    : "${DB_NAME:?DB_NAME is required when DB_AUTO_INIT=true}"
    : "${DB_USER:?DB_USER is required when DB_AUTO_INIT=true}"
    : "${DB_PASS:?DB_PASS is required when DB_AUTO_INIT=true}"
    DB_PORT="${DB_PORT:-3306}"

    attempts=60
    until MYSQL_PWD="$DB_PASS" mysqladmin ping \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --user="$DB_USER" \
        --silent >/dev/null 2>&1
    do
        attempts=$((attempts - 1))
        if [ "$attempts" -le 0 ]; then
            echo "Database did not become available after 60 attempts." >&2
            exit 1
        fi
        sleep 2
    done

    initialized="$(MYSQL_PWD="$DB_PASS" mysql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --user="$DB_USER" \
        --database="$DB_NAME" \
        --batch \
        --skip-column-names \
        --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'deployment_schema_state'")"

    if [ "$initialized" = "0" ]; then
        MYSQL_PWD="$DB_PASS" mysql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --user="$DB_USER" \
            --database="$DB_NAME" \
            < /var/www/html/sql/schema.sql
        MYSQL_PWD="$DB_PASS" mysql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --user="$DB_USER" \
            --database="$DB_NAME" \
            --execute="CREATE TABLE deployment_schema_state (version INT NOT NULL PRIMARY KEY); INSERT INTO deployment_schema_state (version) VALUES (1)"
    fi
fi

exec "$@"

FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends default-mysql-client \
    && docker-php-ext-install pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

COPY . /var/www/html/
COPY docker-entrypoint.sh /usr/local/bin/car-seller-entrypoint

RUN chmod +x /usr/local/bin/car-seller-entrypoint

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "/usr/local/bin/car-seller-entrypoint"]
CMD ["apache2-foreground"]

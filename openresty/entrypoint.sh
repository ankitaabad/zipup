#!/bin/sh
# Fix permissions at runtime
chown -R nobody:nobody /etc/ssl/storage /etc/openresty
chmod -R 755 /etc/ssl/storage /etc/openresty
# Hand over to the original OpenResty startup
exec /usr/local/openresty/bin/openresty -g "daemon off;"
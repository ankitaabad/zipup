# Start from the official alpine image
FROM openresty/openresty:alpine

# Install curl and perl (required by opm in alpine images)
RUN apk add --no-cache curl perl

# Now you can use opm commands in subsequent RUN layers
RUN opm get openresty/lua-resty-lock


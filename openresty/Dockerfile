FROM openresty/openresty:alpine

# opm requires curl + perl on Alpine
RUN apk add --no-cache curl perl

# Install required OpenResty libraries
RUN opm get ledgetech/lua-resty-http
RUN opm get openresty/lua-resty-lock
# (optional but harmless) clean opm cache
RUN rm -rf /root/.opm
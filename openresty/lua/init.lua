-- init.lua
local cjson = require "cjson.safe"
local http  = require "resty.http"
local lock  = require "resty.lock"

local dict = ngx.shared.routes

local ROUTES_URL = "http://zipup:8080/api/__zipup_internal__/routes"
local LOCK_KEY   = "routes_init_lock"
local RETRY_IN   = 3  -- seconds

local function fetch_and_store_routes(premature)
    if premature then
        ngx.log(ngx.WARN, "[routes] timer cancelled (premature)")
        return
    end

    -- ensure only one worker fetches routes
    local l = lock:new("routes", { timeout = 0 })
    local elapsed, lock_err = l:lock(LOCK_KEY)
    if not elapsed then
        ngx.log(ngx.DEBUG, "[routes] another worker is fetching routes")
        return
    end

    ngx.log(ngx.NOTICE, "[routes] fetching routes from ", ROUTES_URL)

    local httpc = http.new()
    httpc:set_timeout(2000)

    local res, req_err = httpc:request_uri(ROUTES_URL, {
        method  = "GET",
        headers = {
            ["Accept"]            = "application/json",
            ["Zipup-Internal-Source"]  = "openresty",
        },
    })

    -- network / connection error
    if not res then
        ngx.log(
            ngx.WARN,
            "[routes] HTTP request failed: ",
            req_err,
            " → retrying in ",
            RETRY_IN,
            "s"
        )
        l:unlock()
        ngx.timer.at(RETRY_IN, fetch_and_store_routes)
        return
    end

    ngx.log(
        ngx.NOTICE,
        "[routes] HTTP response status=",
        res.status,
        " content-type=",
        res.headers["Content-Type"] or "unknown"
    )

    -- non-200 is retryable
    if res.status ~= 200 then
        ngx.log(
            ngx.WARN,
            "[routes] non-200 response: ",
            res.status,
            " body=",
            res.body
        )
        l:unlock()
        ngx.timer.at(RETRY_IN, fetch_and_store_routes)
        return
    end

    -- decode JSON
    local decoded, decode_err = cjson.decode(res.body)
    if not decoded then
        ngx.log(
            ngx.ERR,
            "[routes] JSON decode failed: ",
            decode_err,
            " body=",
            res.body
        )
        l:unlock()
        ngx.timer.at(RETRY_IN, fetch_and_store_routes)
        return
    end

    -- validate payload shape
    if type(decoded.routes) ~= "table" then
        ngx.log(
            ngx.ERR,
            "[routes] invalid payload shape, expected { routes: [] }, got: ",
            res.body
        )
        l:unlock()
        ngx.timer.at(RETRY_IN, fetch_and_store_routes)
        return
    end

    -- store routes
    local ok, set_err = dict:set("routes", cjson.encode(decoded.routes))
    if not ok then
        ngx.log(
            ngx.ERR,
            "[routes] failed to store routes in shared dict: ",
            set_err
        )
        l:unlock()
        ngx.timer.at(RETRY_IN, fetch_and_store_routes)
        return
    end

    ngx.log(
        ngx.NOTICE,
        "[routes] routes loaded successfully, total routes: ",
        #decoded.routes
    )

    l:unlock()
end

-- async start (never blocks nginx boot)
ngx.timer.at(1, fetch_and_store_routes)
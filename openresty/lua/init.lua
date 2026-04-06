-- init.lua
local cjson = require "cjson.safe"
local lock  = require "resty.lock"

local api   = require "internal_routes"

local dict = ngx.shared.routes

local LOCK_KEY = "routes_init_lock"
local RETRY_IN = 3  -- seconds

local function fetch_and_store(premature)
    if premature then
        ngx.log(ngx.WARN, "[init] timer cancelled (premature)")
        return
    end

    -- ensure only one worker runs this
    local l = lock:new("routes", { timeout = 0 })
    local elapsed, lock_err = l:lock(LOCK_KEY)
    if not elapsed then
        ngx.log(ngx.DEBUG, "[init] another worker is already fetching")
        return
    end

    ngx.log(ngx.NOTICE, "[init] fetching routes + domain whitelist")

    -- 🔁 fetch both in parallel style (sequential but clean)
    local routes, routes_err = api.fetch_routes()
    local domains, domains_err = api.fetch_domain_whitelist()

    -- ❌ handle errors
    if not routes then
        ngx.log(ngx.WARN, "[init] failed to fetch routes: ", routes_err)
        l:unlock()
        ngx.timer.at(RETRY_IN, fetch_and_store)
        return
    end

    if not domains then
        ngx.log(ngx.WARN, "[init] failed to fetch domains: ", domains_err)
        l:unlock()
        ngx.timer.at(RETRY_IN, fetch_and_store)
        return
    end

    -- ✅ store routes
    local ok1, err1 = dict:set("routes", cjson.encode(routes))
    if not ok1 then
        ngx.log(ngx.ERR, "[init] failed to store routes: ", err1)
        l:unlock()
        ngx.timer.at(RETRY_IN, fetch_and_store)
        return
    end

    -- ✅ store domains
    local ok2, err2 = dict:set("domains", cjson.encode(domains))
    if not ok2 then
        ngx.log(ngx.ERR, "[init] failed to store domains: ", err2)
        l:unlock()
        ngx.timer.at(RETRY_IN, fetch_and_store)
        return
    end

    ngx.log(
        ngx.NOTICE,
        "[init] loaded successfully | routes: ",
        #routes,
        " | domains: ",
        #domains
    )

    l:unlock()
end

-- async start (non-blocking)
ngx.timer.at(1, fetch_and_store)